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