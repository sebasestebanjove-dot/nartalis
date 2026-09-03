import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// ═══ ENDPOINT READ-ONLY DE AUTOCOMPLETADO ═════════════════════════════════
// Autocomplete del buscador de Home. Fuente EXCLUSIVA: farma_name_cache.
//
// ESTRICTAMENTE READ-ONLY: NO escribe en Neon, NO INSERT/UPDATE/DELETE/UPSERT,
// NO logSearch, NO farma_search_log, NO revalidatePath/revalidateTag,
// NO ingestión AEMPS/PA/ATC, NO llama a /api/farma/search. Solo lee.
//
// Se crea como endpoint independiente (excepción documentada a "no crear
// endpoints") porque /api/farma/search tiene efectos secundarios incompatibles
// con un autocomplete: escribiría en Neon por cada tecla (debounce), revalidaría
// el sitemap, haría upsert de caché y podría disparar ingestión AEMPS.

const MIN_CHARS = 2;
const MAX_CHARS = 100;
const LIMIT = 8;

// Escapa comodines LIKE para que la query del usuario no actúe como wildcard.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('q') || '').trim();

  // Sin query → respuesta vacía válida (sin tocar la BD).
  if (raw.length < MIN_CHARS) {
    return NextResponse.json({ resultados: [] });
  }

  const q = raw.slice(0, MAX_CHARS).toLowerCase();
  const pattern = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;

  try {
    const rows: { nombre: string; nregistro: string }[] = await sql`
      SELECT nombre, nregistro FROM farma_name_cache
      WHERE lower(nombre) LIKE ${pattern}
      ORDER BY
        CASE WHEN lower(nombre) = ${q} THEN 0
             WHEN lower(nombre) LIKE ${prefix} THEN 1
             ELSE 2 END,
        length(nombre) ASC
      LIMIT ${LIMIT}
    `;

    const resultados = rows.map((r) => ({
      nombre: r.nombre || '',
      registro: r.nregistro || '',
    }));

    return NextResponse.json({ resultados });
  } catch (e) {
    console.error('Suggest read-only error:', e);
    // Nunca romper el buscador: ante error devolvemos una respuesta vacía válida.
    return NextResponse.json({ resultados: [] }, { status: 200 });
  }
}
