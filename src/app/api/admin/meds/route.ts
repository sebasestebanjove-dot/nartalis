import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'

// GET /api/admin/meds — métricas de medicamentos (FASE 6/6A).
// Usa nartalis_user_medicamentos y nartalis_user_consultas. Solo ADMIN.
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: adminUnauthorized(guard.reason).error }, { status: adminUnauthorized(guard.reason).status })
  }

  try {
    // ── Top medicamentos guardados ──
    const mostSaved = await sql`
      SELECT nombre, nregistro, COUNT(*)::int AS saves,
             COUNT(*) FILTER (WHERE is_favorite)::int AS favorites
      FROM nartalis_user_medicamentos
      GROUP BY nombre, nregistro
      ORDER BY saves DESC
      LIMIT 10
    `

    // ── Top favoritos ──
    const mostFavorited = await sql`
      SELECT nombre, nregistro, COUNT(*)::int AS favorites
      FROM nartalis_user_medicamentos
      WHERE is_favorite
      GROUP BY nombre, nregistro
      ORDER BY favorites DESC
      LIMIT 10
    `

    // ── Top consultados ──
    const mostConsulted = await sql`
      SELECT nombre, nregistro, COUNT(*)::int AS consultas
      FROM nartalis_user_consultas
      GROUP BY nombre, nregistro
      ORDER BY consultas DESC
      LIMIT 10
    `

    // ── Totales ──
    const [totals] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM nartalis_user_medicamentos) AS saved_total,
        (SELECT COUNT(*)::int FROM nartalis_user_medicamentos WHERE is_favorite) AS favorites_total,
        (SELECT COUNT(*)::int FROM nartalis_user_consultas) AS consultas_total,
        (SELECT COUNT(DISTINCT user_id)::int FROM nartalis_user_medicamentos) AS users_saved,
        (SELECT COUNT(DISTINCT user_id)::int FROM nartalis_user_consultas) AS users_consulted
    `

    return NextResponse.json({ ok: true, data: { mostSaved, mostFavorited, mostConsulted, totals } })
  } catch (err) {
    console.error('admin meds error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
