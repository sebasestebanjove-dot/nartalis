import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || 'NO SET';
  const safeUrl = dbUrl.length > 40 ? dbUrl.substring(0, 30) + '...' : dbUrl;

  try {
    const r = await sql`SELECT COUNT(*)::int AS cnt FROM farma_search_log`;
    return NextResponse.json({
      status: 'ok',
      dbUrlPrefix: safeUrl,
      searchLogCount: r[0].cnt,
      version: 'diag-v1',
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      dbUrlPrefix: safeUrl,
      error: e.message?.substring(0, 200),
    });
  }
}
