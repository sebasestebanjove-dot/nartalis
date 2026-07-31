import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Etiqueta legible/canónica para el Top: "aspirina" → "Aspirina".
function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export async function GET() {
  try {
    const totalRows = await sql`SELECT COUNT(*) as cnt FROM farma_search_log`;
    const totalSearches = Number(totalRows[0]?.cnt || 0);

    // Agrupación por clave normalizada (LOWER + TRIM): "Aspirina", "aspirina",
    // "ASPIRINA" y "  Aspirina  " se contabilizan como UNA sola búsqueda.
    const topRows = await sql`
      SELECT
        LOWER(TRIM(query)) AS qkey,
        COUNT(*) AS cnt
      FROM farma_search_log
      WHERE query IS NOT NULL AND TRIM(query) <> ''
      GROUP BY LOWER(TRIM(query))
      ORDER BY cnt DESC
      LIMIT 5
    `;

    const topQueries = topRows.map((r: any) => ({
      q: titleCase(String(r.qkey)),
      count: Number(r.cnt),
    }));

    const today = new Date().toISOString().slice(0, 10);
    const dailyRows = await sql`
      SELECT COUNT(*) as cnt FROM farma_search_log
      WHERE created_at >= ${today}::date
        AND created_at < (${today}::date + INTERVAL '1 day')
    `;
    const dailyCount = Number(dailyRows[0]?.cnt || 0);

    return NextResponse.json({ totalSearches, topQueries, dailyCount });
  } catch {
    return NextResponse.json({ totalSearches: 0, topQueries: [], dailyCount: 0 });
  }
}
