import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
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
  const searchType = request.nextUrl.searchParams.get('type')?.trim() || 'text';
  if (!['text', 'voice'].includes(searchType)) {
    return NextResponse.json({ error: 'Tipo de búsqueda inválido' }, { status: 400 });
  }
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Introduce al menos 2 caracteres' }, { status: 400 });
  }

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
        try { await sql`INSERT INTO farma_search_log (query, search_type) VALUES (${correctedBase}, ${searchType})`; } catch {}
        for (const r of resultados) await upsertCache(r.nombre, r.registro);
        return NextResponse.json({
          resultados,
          total: data.totalFilas || resultados.length,
          suggestedCorrection: correctedBase,
        });
      }

      try { await sql`INSERT INTO farma_search_log (query, search_type) VALUES (${q}, ${searchType})`; } catch {}
      for (const r of resultados) await upsertCache(r.nombre, r.registro);
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
          try { await sql`INSERT INTO farma_search_log (query, search_type) VALUES (${correctedBase}, ${searchType})`; } catch {}
          for (const r of retryResultados) await upsertCache(r.nombre, r.registro);
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
            threshold: 0.4,
            minMatchCharLength: 3,
          });
          const fuseResults = fuse.search(q);
          if (fuseResults.length > 0) {
            const best = fuseResults[0].item;
            const correctedNom = best.nombre;
            const fuzzyRes = await fetch(
              `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(correctedNom)}`,
              { signal: AbortSignal.timeout(10000) },
            );
            if (fuzzyRes.ok) {
              const fuzzyData = await fuzzyRes.json();
              const fuzzyResultados = mapResultados(fuzzyData);
              if (fuzzyResultados.length > 0) {
                const correctedBase = (fuzzyResultados[0].nombre || '').split(/\s+/)[0]?.toLowerCase() || correctedNom;
                try { await sql`INSERT INTO farma_search_log (query, search_type) VALUES (${correctedBase}, ${searchType})`; } catch {}
                for (const r of fuzzyResultados) await upsertCache(r.nombre, r.registro);
                return NextResponse.json({
                  resultados: fuzzyResultados,
                  total: fuzzyData.totalFilas || fuzzyResultados.length,
                  suggestedCorrection: correctedBase,
                });
              }
            }
          }
        }
      } catch { /* fuzzy fallback no debe romper la búsqueda normal */ }
    }

    // ─── Sin resultados en ningún intento — no se guarda en log ───
    return NextResponse.json({ resultados: [], total: 0 });
  } catch {
    return NextResponse.json({ error: 'Error de conexión con CIMA' }, { status: 502 });
  }
}
