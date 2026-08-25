// NARTALIS - SEO FASE 2A.2
// Resolución/vínculo de pa_cache -> farma_principles en tiempo de ejecución.
// Usado por ingestPaCache. Reutiliza la misma normalización que la población.
import { sql } from '@/lib/db';
import { normalizedKey, slugifyPrincipio, capitalizeName, classify } from '@/lib/pa-normalize.mjs';

export interface PrincipleRef {
  id: number;
  tipo: string;
}

// Resuelve (o crea) la entidad canónica para un PA. Las entidades compuestas y
// basura pueden existir para trazabilidad, pero NUNCA quedan activas (solo
// tipo='simple' puede ser indexable). Idempotente y sin N+1.
export async function resolveOrCreatePrinciple(pa: string): Promise<PrincipleRef | null> {
  const key = normalizedKey(pa);
  if (!key) return null;
  const tipo = classify(pa);

  const existing = await sql`
    SELECT id, tipo FROM farma_principles WHERE normalized_key = ${key} LIMIT 1
  `;
  if (existing.length) return { id: existing[0].id as number, tipo: existing[0].tipo as string };

  const slugBase = slugifyPrincipio(pa) || 'pa-' + key.slice(0, 40);
  const inserted = await sql`
    INSERT INTO farma_principles
      (principio_original, nombre_canonico, slug, normalized_key, tipo, origen, active, medicine_count)
    VALUES
      (${pa.toLowerCase()}, ${capitalizeName(pa)}, ${slugBase}, ${key}, ${tipo}, 'pa_cache', false, 0)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id, tipo
  `;
  if (inserted.length) return { id: inserted[0].id as number, tipo: inserted[0].tipo as string };

  // Colisión de slug puntual: recuperar el de la misma normalized_key.
  const again = await sql`
    SELECT id, tipo FROM farma_principles WHERE normalized_key = ${key} LIMIT 1
  `;
  if (again.length) return { id: again[0].id as number, tipo: again[0].tipo as string };
  return null;
}

// Recalcula medicine_count (COUNT(DISTINCT nregistro)) y active de forma
// idempotente sin N+1: una sola UPDATE con subconsulta agregada por entidad.
export async function recomputePrincipleStats(id: number): Promise<void> {
  await sql`
    UPDATE farma_principles f SET
      medicine_count = agg.n,
      active = (f.tipo = 'simple' AND agg.n >= 3),
      last_seen = NOW()
    FROM (
      SELECT pa_principle_id, COUNT(DISTINCT nregistro)::int AS n
      FROM pa_cache
      WHERE pa_principle_id = ${id}
      GROUP BY pa_principle_id
    ) agg
    WHERE f.id = agg.pa_principle_id
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Versión en lote: resuelve/crea todas las entidades del lote, hace upsert
// masivo de pa_cache y recalcula medicine_count una sola vez para todos los
// principios afectados. Reduce el patrón N+1 (3 queries por PA) a ~5 queries
// por lote independientemente del número de medicamentos.
// ─────────────────────────────────────────────────────────────────────────────

function escBatch(s: string): string { return "'" + (s || '').replace(/'/g, "''") + "'"; }

export interface BatchPair { pa: string; nregistro: string }

export async function ingestPrinciplesBatch(pairs: BatchPair[]): Promise<void> {
  // 1) Deduplicar pares completos (pa+nregistro) y recolectar claves normalizadas únicas
  const seenPairs = new Set<string>();
  const cleanPairs: { pa: string; nregistro: string }[] = [];
  const keyToPas = new Map<string, string[]>();
  for (const { pa, nregistro } of pairs) {
    if (!pa || !nregistro) continue;
    const k = normalizedKey(pa);
    if (!k) continue;
    const pk = k + '|' + nregistro;
    if (seenPairs.has(pk)) continue;
    seenPairs.add(pk);
    cleanPairs.push({ pa, nregistro });
    const list = keyToPas.get(k);
    if (list) list.push(pa);
    else keyToPas.set(k, [pa]);
  }
  if (cleanPairs.length === 0) return;

  // 2) Resolver existentes en UNA consulta (valores inline como upsertCacheBatch)
  const keys = [...keyToPas.keys()];
  const keyPlaceholders = keys.map(k => escBatch(k)).join(',');
  const existingRows = await sql.unsafe(
    `SELECT id, tipo, normalized_key FROM farma_principles WHERE normalized_key IN (${keyPlaceholders})`,
  ) as { id: number; tipo: string; normalized_key: string }[];
  const refByKey = new Map<string, PrincipleRef>();
  for (const r of existingRows) refByKey.set(r.normalized_key, { id: r.id, tipo: r.tipo });

  // 3) Crear faltantes en UNA consulta multi-VALUES
  const missing = keys.filter(k => !refByKey.has(k));
  if (missing.length) {
    const values = missing.map(k => {
      const pa = keyToPas.get(k)![0];
      const tipo = classify(pa);
      const slugBase = slugifyPrincipio(pa) || 'pa-' + k.slice(0, 40);
      return `(${escBatch(pa.toLowerCase())}, ${escBatch(capitalizeName(pa))}, ${escBatch(slugBase)}, ${escBatch(k)}, ${escBatch(tipo)}, 'pa_cache', false, 0)`;
    }).join(', ');
    await sql.unsafe(`INSERT INTO farma_principles
      (principio_original, nombre_canonico, slug, normalized_key, tipo, origen, active, medicine_count)
      VALUES ${values}
      ON CONFLICT (slug) DO NOTHING`);
    // Recuperar ids de los recién creados + colisiones de slug resueltas
    const createdRows = await sql.unsafe(
      `SELECT id, tipo, normalized_key FROM farma_principles WHERE normalized_key IN (${keyPlaceholders})`,
    ) as { id: number; tipo: string; normalized_key: string }[];
    for (const r of createdRows) refByKey.set(r.normalized_key, { id: r.id, tipo: r.tipo });
  }

  // 4) Upsert masivo de pa_cache en UNA consulta
  if (cleanPairs.length > 0) {
    const values = cleanPairs.map(p => {
      const k = normalizedKey(p.pa);
      const pid = refByKey.get(k)?.id;
      return `(${escBatch(p.pa.toLowerCase())}, ${escBatch(p.nregistro)}, ${pid != null ? pid : 'NULL'})`;
    }).join(', ');
    await sql.unsafe(`INSERT INTO pa_cache (principio, nregistro, pa_principle_id)
      VALUES ${values}
      ON CONFLICT (principio, nregistro) DO UPDATE SET
        pa_principle_id = EXCLUDED.pa_principle_id,
        updated_at = NOW()`);
  }

  // 5) Recalcular medicine_count una sola vez para todos los principios afectados
  const principleIds = [...new Set([...refByKey.values()].map(r => r.id))];
  if (principleIds.length > 0) {
    const idList = principleIds.join(',');
    await sql.unsafe(`
      UPDATE farma_principles f SET
        medicine_count = agg.n,
        active = (f.tipo = 'simple' AND agg.n >= 3),
        last_seen = NOW()
      FROM (
        SELECT pa_principle_id, COUNT(DISTINCT nregistro)::int AS n
        FROM pa_cache
        WHERE pa_principle_id IN (${idList})
        GROUP BY pa_principle_id
      ) agg
      WHERE f.id = agg.pa_principle_id`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recopilador de pares PA→registro desde un array de resultados CIMA.
// Extrae y deduplica internamente; utilizado por el batch del buscador.
// ─────────────────────────────────────────────────────────────────────────────
export function collectPaPairs(resultados: { pactivos?: string | null; registro?: string }[]): BatchPair[] {
  const pairs: BatchPair[] = [];
  for (const r of resultados) {
    if (!r.pactivos || !r.registro) continue;
    for (const pa of String(r.pactivos).split(/,|\+/)) {
      const trimmed = pa.trim();
      if (trimmed) pairs.push({ pa: trimmed, nregistro: r.registro });
    }
  }
  return pairs;
}

// Inserción/upsert de la relación PA -> medicamento, dejando pa_principle_id
// resuelto y los contadores actualizados. Idempotente.
export async function ingestPrincipleIfPresent(pa: string, nregistro: string): Promise<void> {
  if (!pa || !nregistro) return;
  const ref = await resolveOrCreatePrinciple(pa);
  const pid = ref ? ref.id : null;
  await sql`
    INSERT INTO pa_cache (principio, nregistro, pa_principle_id)
    VALUES (${pa.toLowerCase()}, ${nregistro}, ${pid})
    ON CONFLICT (principio, nregistro) DO UPDATE SET
      pa_principle_id = EXCLUDED.pa_principle_id,
      updated_at = NOW()
  `;
  if (pid) await recomputePrincipleStats(pid);
}