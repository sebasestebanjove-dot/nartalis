import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'

// GET /api/admin/stats — KPIs del dashboard administrativo (FASE 6/6A).
// Solo ADMIN. Todas las métricas se calculan desde DB en tiempo real.
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: adminUnauthorized(guard.reason).error }, { status: adminUnauthorized(guard.reason).status })
  }

  try {
    // ── Usuarios ──
    const [u] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS new_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_30d,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '24 hours')::int AS active_24h,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '7 days')::int AS active_7d,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '30 days')::int AS active_30d,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '7 days')::int AS logins_7d,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '30 days')::int AS logins_30d,
        COUNT(*) FILTER (WHERE plan = 'FREE')::int AS plan_free,
        COUNT(*) FILTER (WHERE plan = 'PREMIUM')::int AS plan_premium,
        COUNT(*) FILTER (WHERE role = 'ADMIN')::int AS role_admin,
        COUNT(*) FILTER (WHERE role = 'USER')::int AS role_user,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS status_active,
        COUNT(*) FILTER (WHERE status = 'DISABLED')::int AS status_disabled
      FROM nartalis_users
    `

    // ── Buscador ──
    const [s] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30d,
        COUNT(*) FILTER (WHERE search_type = 'text')::int AS text_count,
        COUNT(*) FILTER (WHERE search_type = 'voice')::int AS voice_count,
        COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
        COUNT(*) FILTER (WHERE NOT was_successful)::int AS without_results,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS authenticated,
        COUNT(*) FILTER (WHERE user_id IS NULL)::int AS anonymous
      FROM farma_search_log
    `

    // ── Espacio ──
    const [esp] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM nartalis_user_medicamentos) AS saved,
        (SELECT COUNT(*)::int FROM nartalis_user_medicamentos WHERE is_favorite) AS favorites,
        (SELECT COUNT(*)::int FROM nartalis_user_consultas) AS consultas,
        (SELECT COUNT(DISTINCT user_id)::int FROM nartalis_user_medicamentos) AS users_with_meds,
        (SELECT COUNT(DISTINCT user_id)::int FROM nartalis_user_consultas) AS users_with_consultas
    `

    return NextResponse.json({
      ok: true,
      data: {
        usuarios: u,
        buscador: s,
        espacio: esp,
      },
    })
  } catch (err) {
    console.error('admin stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
