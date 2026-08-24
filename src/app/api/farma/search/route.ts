import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { getNartalisSession } from '@/lib/auth';
import { cimaBreaker } from '@/lib/circuit-breaker';
import { ingestPrincipleIfPresent } from '@/lib/pa-principle';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0),
      );
  return dp[m][n];
}

function isSimilar(q: string, suggestion: string): boolean {
  const ql = q.toLowerCase();
  const sl = suggestion.toLowerCase();
  if (sl.startsWith(ql) || ql.startsWith(sl)) return true;
  const dist = levenshtein(ql, sl);
  const maxDist = Math.max(2, Math.floor(ql.length * 0.4));
  return dist <= maxDist;
}

function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// Clave estadística normalizada: las búsquedas con variaciones de
// mayúsculas/minúsculas y espacios deben incrementar el MISMO contador.
function normalizeSearch(q: string): string {
  return q.trim().toLowerCase();
}

// Origen de la búsqueda (trazabilidad interna). El total y el Top 5 son SIEMPRE
// globales: source/source_page solo describen el punto de entrada.
const SEARCH_SOURCES = ['home', 'medicine_page'] as const;
type SearchSource = (typeof SEARCH_SOURCES)[number];

function parseSource(v: string | null): SearchSource {
  return (SEARCH_SOURCES as readonly string[]).includes(v || '') ? (v as SearchSource) : 'home';
}

function parseSourcePage(v: string | null): string | null {
  if (!v) return null;
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!cleaned || !cleaned.startsWith('/')) return null;
  return cleaned.slice(0, 200);
}

// Persistencia de búsqueda (FASE 6/6A): registra user_id (solo server-side),
// result_count real y was_successful. Nunca falla la búsqueda del usuario.
// used_fallback/fallback_reason distinguen búsquedas servidas desde BD local.
// source/source_page registran el origen ('home' | 'medicine_page'); si la
// migración no estuviera aplicada, se reintenta el INSERT legacy para que el
// registro de búsquedas NUNCA se pierda.
async function logSearch(opts: {
  query: string;
  searchType: 'text' | 'voice';
  userId: string | null;
  resultCount: number;
  wasSuccessful: boolean;
  isTest?: boolean;
  usedFallback?: boolean;
  fallbackReason?: string | null;
  source?: SearchSource;
  sourcePage?: string | null;
}) {
  try {
    await sql`
      INSERT INTO farma_search_log (query, search_type, user_id, result_count, was_successful, is_test, used_fallback, fallback_reason, source, source_page)
      VALUES (${opts.query}, ${opts.searchType}, ${opts.userId}, ${opts.resultCount}, ${opts.wasSuccessful}, ${opts.isTest ?? false}, ${opts.usedFallback ?? false}, ${opts.fallbackReason ?? null}, ${opts.source ?? 'home'}, ${opts.sourcePage ?? null})
    `;
  } catch {
    try {
      await sql`
        INSERT INTO farma_search_log (query, search_type, user_id, result_count, was_successful, is_test, used_fallback, fallback_reason)
        VALUES (${opts.query}, ${opts.searchType}, ${opts.userId}, ${opts.resultCount}, ${opts.wasSuccessful}, ${opts.isTest ?? false}, ${opts.usedFallback ?? false}, ${opts.fallbackReason ?? null})
      `;
    } catch { /* el logging nunca debe romper la búsqueda */ }
  }
}

async function upsertCache(nombre: string, nregistro: string) {
  if (!nombre || !nregistro) return;
  try {
    await sql`
      INSERT INTO farma_name_cache (nombre, nregistro)
      VALUES (${nombre}, ${nregistro})
      ON CONFLICT (nregistro) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        updated_at = NOW()
    `;
  } catch { /* silent */ }
}

// Versión batch: todas las filas en una sola sentencia SQL.
// Elimina el N+1 secuencial que causaba 6–9s de overhead en búsquedas grandes.
async function upsertCacheBatch(items: { nombre: string; registro: string }[]) {
  if (items.length === 0) return;
  const esc = (s: string) => "'" + (s || '').replace(/'/g, "''") + "'";
  const values = items.map(r => `(${esc(r.nombre)}, ${esc(r.registro)})`).join(', ');
  try {
    await sql.unsafe(`
      INSERT INTO farma_name_cache (nombre, nregistro) VALUES ${values}
      ON CONFLICT (nregistro) DO UPDATE SET nombre = EXCLUDED.nombre, updated_at = NOW()
    `);
  } catch { /* silent */ }
}

function mapResultados(data: any) {
  return (data.resultados || []).map((r: any) => ({
    nombre: r.nombre || '',
    registro: r.nregistro || '',
    laboratorio: r.labtitular || '',
    laboratorioComercializador: r.labcomercializador || '',
    receta: r.receta || false,
    conduc: r.conduc || false,
    cpresc: r.cpresc || '',
    vias: (r.viasAdministracion || []).map((v: any) => v.nombre),
    imagenUrl: r.fotos?.[0]?.url || null,
    prospectoUrl: (r.docs || []).find((d: any) => d.tipo === 2)?.url || null,
    fichaTecnicaUrl: (r.docs || []).find((d: any) => d.tipo === 1)?.url || null,
    generico: r.generico || false,
    triangulo: r.triangulo || false,
    psum: r.psum || false,
    notas: r.notas || false,
    biosimilar: r.biosimilar || false,
    huerfano: r.huerfano || false,
    ema: r.ema || false,
    materialesInf: r.materialesInf || false,
    comerc: r.comerc ?? true,
    dosis: r.dosis || null,
    formaFarmaceutica: r.formaFarmaceuticaSimplificada?.nombre || null,
    pactivos: r.pactivos || null,
  }));
}

// ═══ FALLBACK LOCAL ═══════════════════════════════════════════════════════
// farma_name_cache solo contiene nombre + nregistro + updated_at. Nunca
// inventamos laboratorio, presentaciones, prospecto, etc.: esos campos se
// devuelven con valores seguros (vacíos/null) para que el usuario vea que es
// un respaldo local, no una consulta completa a CIMA.

// Escapa comodines LIKE para que la query del usuario no actúe como wildcard.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

async function searchLocalCache(q: string): Promise<{ nombre: string; nregistro: string }[]> {
  const ql = q.trim().toLowerCase();
  if (!ql) return [];
  const pattern = `%${escapeLike(ql)}%`;
  const prefix = `${escapeLike(ql)}%`;
  try {
    const rows = await sql`
      SELECT nombre, nregistro FROM farma_name_cache
      WHERE lower(nombre) LIKE ${pattern}
      ORDER BY
        CASE WHEN lower(nombre) = ${ql} THEN 0
             WHEN lower(nombre) LIKE ${prefix} THEN 1
             ELSE 2 END,
        length(nombre) ASC
      LIMIT 20
    `;
    return rows;
  } catch {
    return [];
  }
}

function mapLocalResultados(rows: { nombre: string; nregistro: string }[]): any[] {
  return rows.map((r) => ({
    nombre: r.nombre || '',
    registro: r.nregistro || '',
    laboratorio: '',
    laboratorioComercializador: '',
    receta: false,
    conduc: false,
    cpresc: '',
    vias: [],
    imagenUrl: null,
    prospectoUrl: null,
    fichaTecnicaUrl: null,
    generico: false,
    triangulo: false,
    psum: false,
    notas: false,
    biosimilar: false,
    huerfano: false,
    ema: false,
    materialesInf: false,
    comerc: true,
    dosis: null,
    formaFarmaceutica: null,
    pactivos: null,
  }));
}

function classifyCimaError(err: unknown): 'cima_unreachable' | 'timeout' {
  const name = (err as any)?.name;
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
  return 'cima_unreachable';
}

// Sirve la respuesta de respaldo desde farma_name_cache. Siempre devuelve
// fallback:true (o 502 solo si la BD local también falla). Nunca un 502 por
// culpa de CIMA: si CIMA cae y la caché local no tiene resultados, devolvemos
// una respuesta vacía con fallback:true y mensaje aclaratorio.
async function serveLocalFallback(
  q: string,
  searchType: 'text' | 'voice',
  userId: string | null,
  isTest: boolean,
  respond: (body: any, status?: number) => NextResponse,
  reason: 'cima_unreachable' | 'cima_http_5xx' | 'timeout',
  source: SearchSource = 'home',
  sourcePage: string | null = null,
) {
  let rows: { nombre: string; nregistro: string }[];
  try {
    rows = await searchLocalCache(q);
  } catch (e) {
    console.error('Local fallback DB error:', e);
    return respond({ error: 'Error de conexión con CIMA y base de datos local' }, 502);
  }
  const resultados = mapLocalResultados(rows);
  const wasSuccessful = resultados.length > 0;
  try {
    await logSearch({
      query: normalizeSearch(q),
      searchType,
      userId,
      resultCount: resultados.length,
      wasSuccessful,
      isTest,
      usedFallback: true,
      fallbackReason: reason,
      source,
      sourcePage,
    });
  } catch { /* nunca rompe la respuesta */ }
  const body: any = {
    resultados,
    total: resultados.length,
    fallback: true,
    fallbackReason: reason,
  };
  if (!wasSuccessful) {
    body.message = 'CIMA no está disponible temporalmente y no encontramos resultados en los datos locales. Prueba de nuevo en unos minutos.';
  }
  return respond(body);
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const typeParam = request.nextUrl.searchParams.get('type')?.trim() || 'text';
  // Origen de la búsqueda: validado server-side. El cliente solo sugiere.
  const source = parseSource(request.nextUrl.searchParams.get('source'));
  const sourcePage = parseSourcePage(request.nextUrl.searchParams.get('source_page'));

  // is_test / headers de test: SOLO activos en entornos NO producción.
  const isTest = process.env.VERCEL_ENV !== 'production' && request.headers.get('x-nartalis-test') === '1';
  // Simulación de caída de CIMA (solo tests; jamás en producción).
  const forceCimaFail = isTest && request.headers.get('x-force-nartalis-cima-fail') === '1';

  // Solo tests: acortar el cooldown del breaker para verificar recuperación.
  if (isTest) {
    const cd = request.headers.get('x-nartalis-breaker-cooldown-ms');
    if (cd && /^\d+$/.test(cd)) {
      const ms = parseInt(cd, 10);
      if (ms >= 100) cimaBreaker.setOpenTimeoutMs(ms);
    }
  }

  const respond = (body: any, status = 200) => {
    const res = NextResponse.json(body, { status });
    if (isTest) res.headers.set('x-nartalis-breaker-state', cimaBreaker.getState());
    return res;
  };

  if (!['text', 'voice'].includes(typeParam)) {
    return respond({ error: 'Tipo de búsqueda inválido' }, 400);
  }
  const searchType = typeParam as 'text' | 'voice';
  if (!q || q.length < 2) {
    return respond({ error: 'Introduce al menos 2 caracteres' }, 400);
  }

  // user_id SIEMPRE se resuelve server-side desde la sesión. Nunca del cliente.
  let userId: string | null = null;
  try {
    const session = await getNartalisSession();
    userId = session?.id ?? null;
  } catch { /* sin sesión → búsqueda anónima */ }

  // ─── Circuit breaker: si está abierto, no gastamos el timeout de CIMA ───
  if (!cimaBreaker.shouldAttemptCima()) {
    return await serveLocalFallback(q, searchType, userId, isTest, respond, 'cima_unreachable', source, sourcePage);
  }

  try {
    if (forceCimaFail) {
      throw new DOMException('Simulated CIMA failure (test)', 'TimeoutError');
    }

    const res = await fetch(
      `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) {
      cimaBreaker.onCimaFailure();
      return await serveLocalFallback(q, searchType, userId, isTest, respond, 'cima_http_5xx', source, sourcePage);
    }
    cimaBreaker.onCimaSuccess();
    const data = await res.json();
    let resultados = mapResultados(data);

    // ─── CIMA devolvió resultados ─────────────────────────────────
    if (resultados.length > 0) {
      const qLower = q.toLowerCase();
      const exactMatch = resultados.some((r: any) => {
        const baseName = (r.nombre || '').split(/\s+/)[0]?.toLowerCase() || '';
        return baseName === qLower;
      });

      if (!exactMatch) {
        const correctedBase = (resultados[0].nombre || '').split(/\s+/)[0]?.toLowerCase() || qLower;
        const similar = isSimilar(q, correctedBase);
        try { await logSearch({ query: normalizeSearch(correctedBase), searchType, userId, resultCount: resultados.length, wasSuccessful: true, isTest, source, sourcePage }); } catch {}
        await upsertCacheBatch(resultados.map((r: any) => ({ nombre: r.nombre, registro: r.registro })));
        revalidatePath('/sitemap.xml');
        for (const r of resultados) {
          if (r.pactivos) {
            for (const pa of r.pactivos.split(/,|\+/)) {
              const trimmed = pa.trim();
              if (trimmed) {
                try { await ingestPrincipleIfPresent(trimmed, r.registro); } catch { /* silent */ }
              }
            }
          }
        }
        return respond({
          resultados,
          total: data.totalFilas || resultados.length,
          fallback: false,
          ...(similar ? { suggestedCorrection: correctedBase } : {}),
        });
      }

        try { await logSearch({ query: normalizeSearch(q), searchType, userId, resultCount: resultados.length, wasSuccessful: true, isTest, source, sourcePage }); } catch {}
        await upsertCacheBatch(resultados.map((r: any) => ({ nombre: r.nombre, registro: r.registro })));
        revalidatePath('/sitemap.xml');
        for (const r of resultados) {
          if (r.pactivos) {
            for (const pa of r.pactivos.split(/,|\+/)) {
              const trimmed = pa.trim();
              if (trimmed) {
                try { await ingestPrincipleIfPresent(trimmed, r.registro); } catch { /* silent */ }
              }
            }
          }
        }
        return respond({ resultados, total: data.totalFilas || resultados.length, fallback: false });
    }

    // ─── Sin resultados — reintentar con prefijos más cortos ──────
    if (q.length >= 4) {
      for (let i = 1; i <= 3; i++) {
        const prefix = q.slice(0, -i);
        if (prefix.length < 3) break;
        const retryRes = await fetch(
          `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(prefix)}`,
          { signal: AbortSignal.timeout(10000) },
        );
        if (!retryRes.ok) continue;
        const retryData = await retryRes.json();
        const retryResultados = mapResultados(retryData);
        if (retryResultados.length > 0) {
          const correctedBase = (retryResultados[0].nombre || '').split(/\s+/)[0]?.toLowerCase() || prefix;
          if (!isSimilar(q, correctedBase)) break;
          try { await logSearch({ query: normalizeSearch(correctedBase), searchType, userId, resultCount: retryResultados.length, wasSuccessful: true, isTest, source, sourcePage }); } catch {}
          await upsertCacheBatch(retryResultados.map((r: any) => ({ nombre: r.nombre, registro: r.registro })));
          revalidatePath('/sitemap.xml');
          for (const r of retryResultados) {
            if (r.pactivos) {
              for (const pa of r.pactivos.split(/,|\+/)) {
                const trimmed = pa.trim();
                if (trimmed) {
                  try { await ingestPrincipleIfPresent(trimmed, r.registro); } catch { /* silent */ }
                }
              }
            }
          }
          return respond({
            resultados: retryResultados,
            total: retryData.totalFilas || retryResultados.length,
            fallback: false,
            suggestedCorrection: correctedBase,
          });
        }
      }
    }

    // ─── Sin resultados — fuzzy search contra caché ────────────────
    if (resultados.length === 0 && q.length >= 3) {
      try {
        const rows = await sql`SELECT nombre, nregistro FROM farma_name_cache`;
        if (rows.length > 0) {
          const Fuse = (await import('fuse.js')).default;
          const fuse = new Fuse(rows as { nombre: string; nregistro: string }[], {
            keys: ['nombre'],
            threshold: 0.25,
            minMatchCharLength: 3,
          });
          const fuseResults = fuse.search(q);
          if (fuseResults.length > 0) {
            const best = fuseResults[0].item;
            const correctedNom = best.nombre;
            const correctedBase = correctedNom.split(/\s+/)[0]?.toLowerCase() || '';
            if (correctedBase && isSimilar(q, correctedBase)) {
              const fuzzyRes = await fetch(
                `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(correctedNom)}`,
                { signal: AbortSignal.timeout(10000) },
              );
              if (fuzzyRes.ok) {
                const fuzzyData = await fuzzyRes.json();
                const fuzzyResultados = mapResultados(fuzzyData);
                if (fuzzyResultados.length > 0) {
                  try { await logSearch({ query: normalizeSearch(correctedBase), searchType, userId, resultCount: fuzzyResultados.length, wasSuccessful: true, isTest, source, sourcePage }); } catch {}
                  await upsertCacheBatch(fuzzyResultados.map((r: any) => ({ nombre: r.nombre, registro: r.registro })));
                  revalidatePath('/sitemap.xml');
                  for (const r of fuzzyResultados) {
                    if (r.pactivos) {
                      for (const pa of r.pactivos.split(/,|\+/)) {
                        const trimmed = pa.trim();
                        if (trimmed) {
                          try { await ingestPrincipleIfPresent(trimmed, r.registro); } catch { /* silent */ }
                        }
                      }
                    }
                  }
                  return respond({
                    resultados: fuzzyResultados,
                    total: fuzzyData.totalFilas || fuzzyResultados.length,
                    fallback: false,
                    suggestedCorrection: correctedBase,
                  });
                }
              }
            }
          }
        }
      } catch { /* fuzzy fallback no debe romper la búsqueda normal */ }
    }

    // ─── Sin resultados en ningún intento — se registra con result_count=0 ───
    try { await logSearch({ query: normalizeSearch(q), searchType, userId, resultCount: 0, wasSuccessful: false, isTest, source, sourcePage }); } catch {}
    const msg = 'No encontramos "' + q + '" en la base de datos de medicamentos AEMPS. Este producto puede no ser un medicamento registrado en España. Prueba con otro nombre.';
    return respond({ resultados: [], total: 0, message: msg, fallback: false });
  } catch (err) {
    cimaBreaker.onCimaFailure();
    const reason = classifyCimaError(err);
    return await serveLocalFallback(q, searchType, userId, isTest, respond, reason, source, sourcePage);
  }
}
