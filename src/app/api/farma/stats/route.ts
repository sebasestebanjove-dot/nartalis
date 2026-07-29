import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const totalRows = await sql`SELECT COUNT(*) as cnt FROM farma_search_log`;
    const totalSearches = Number(totalRows[0]?.cnt || 0);

    const topRows = await sql`
      SELECT query, COUNT(*) as cnt
      FROM farma_search_log
      GROUP BY query
      ORDER BY cnt DESC
      LIMIT 5
    `;

    const topQueries = topRows.map((r: any) => ({
      q: r.query,
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
