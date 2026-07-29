import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/* GET /api/dermo/admin/telemetry — aggregated telemetry for admin panel */
export async function GET(req: NextRequest) {
  try {
    /* Simple admin check via header or session — extend as needed */
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365);

    const [totalResult, byProductResult, byTypeResult, dailyResult] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS total, COALESCE(SUM(tokens_consumed), 0)::int AS total_tokens
        FROM dermo_telemetry_log
        WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
      `,
      sql`
        SELECT product_name, COUNT(*)::int AS count
        FROM dermo_telemetry_log
        WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
        GROUP BY product_name
        ORDER BY count DESC
        LIMIT 20
      `,
      sql`
        SELECT user_type, COUNT(*)::int AS count
        FROM dermo_telemetry_log
        WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
        GROUP BY user_type
      `,
      sql`
        SELECT DATE(created_at) AS day, COUNT(*)::int AS count
        FROM dermo_telemetry_log
        WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    return NextResponse.json({
      total: totalResult[0],
      byProduct: byProductResult,
      byUserType: byTypeResult,
      daily: dailyResult,
    });
  } catch (err) {
    console.error('Error fetching telemetry:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
