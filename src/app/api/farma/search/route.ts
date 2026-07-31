import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { getNartalisSession } from '@/lib/auth';

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

// Persistencia de búsqueda (FASE 6/6A): registra user_id (solo server-side),
// result_count real y was_successful. Nunca falla la búsqueda del usuario.
async function logSearch(opts: {
  query: string;
  searchType: 'text' | 'voice';
  userId: string | null;
  resultCount: number;
  wasSuccessful: boolean;
}) {
  try {
    await sql`
      INSERT INTO farma_search_log (query, search_type, user_id, result_count, was_successful)
      VALUES (${opts.query}, ${opts.searchType}, ${opts.userId}, ${opts.resultCount}, ${opts.wasSuccessful})
    `;
  } catch { /* el logging nunca debe romper la búsqueda */ }
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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const typeParam = request.nextUrl.searchParams.get('type')?.trim() || 'text';
  if (!['text', 'voice'].includes(typeParam)) {
    return NextResponse.json({ error: 'Tipo de búsqueda inválido' }, { status: 400 });
  }
  const searchType = typeParam as 'text' | 'voice';
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Introduce al menos 2 caracteres' }, { status: 400 });
  }

  // user_id SIEMPRE se resuelve server-side desde la sesión. Nunca del cliente.
  let userId: string | null = null;
  try {
    const session = await getNartalisSession();
    userId = session?.id ?? null;
  } catch { /* sin sesión → búsqueda anónima */ }

  try {
    const res = await fetch(
      `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) {
      return NextResponse.json({ error: 'Error al consultar CIMA' }, { status: 502 });
    }
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
        try { await logSearch({ query: normalizeSearch(correctedBase), searchType, userId, resultCount: resultados.length, wasSuccessful: true }); } catch {}
        for (const r of resultados) await upsertCache(r.nombre, r.registro);
        revalidatePath('/sitemap.xml');
        return NextResponse.json({
          resultados,
          total: data.totalFilas || resultados.length,
          ...(similar ? { suggestedCorrection: correctedBase } : {}),
        });
      }

      try { await logSearch({ query: normalizeSearch(q), searchType, userId, resultCount: resultados.length, wasSuccessful: true }); } catch {}
      for (const r of resultados) await upsertCache(r.nombre, r.registro);
      revalidatePath('/sitemap.xml');
      return NextResponse.json({ resultados, total: data.totalFilas || resultados.length });
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
          try { await logSearch({ query: normalizeSearch(correctedBase), searchType, userId, resultCount: retryResultados.length, wasSuccessful: true }); } catch {}
          for (const r of retryResultados) await upsertCache(r.nombre, r.registro);
          revalidatePath('/sitemap.xml');
          return NextResponse.json({
            resultados: retryResultados,
            total: retryData.totalFilas || retryResultados.length,
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
          try { await logSearch({ query: normalizeSearch(correctedBase), searchType, userId, resultCount: fuzzyResultados.length, wasSuccessful: true }); } catch {}
                  for (const r of fuzzyResultados) await upsertCache(r.nombre, r.registro);
                  revalidatePath('/sitemap.xml');
                  return NextResponse.json({
                    resultados: fuzzyResultados,
                    total: fuzzyData.totalFilas || fuzzyResultados.length,
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
    try { await logSearch({ query: normalizeSearch(q), searchType, userId, resultCount: 0, wasSuccessful: false }); } catch {}
    const msg = 'No encontramos "' + q + '" en la base de datos de medicamentos AEMPS. Este producto puede no ser un medicamento registrado en España. Prueba con otro nombre.';
    return NextResponse.json({ resultados: [], total: 0, message: msg });
  } catch {
    return NextResponse.json({ error: 'Error de conexión con CIMA' }, { status: 502 });
  }
}
