import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'

// GET /api/admin/activity — actividad reciente: últimas búsquedas y últimos registros. Solo ADMIN.
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    const u = adminUnauthorized(guard.reason)
    return NextResponse.json({ error: u.error }, { status: u.status })
  }

  try {
    const recentSearches = await sql`
      SELECT s.query, s.search_type, s.result_count, s.was_successful, s.created_at, s.user_id,
             s.is_test, u.email AS user_email
      FROM farma_search_log s
      LEFT JOIN nartalis_users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT 25
    `

    const recentRegistrations = await sql`
      SELECT id, name, email, plan, created_at
      FROM nartalis_users
      ORDER BY created_at DESC
      LIMIT 15
    `

    return NextResponse.json({ ok: true, data: { recentSearches, recentRegistrations } })
  } catch (err) {
    console.error('admin activity error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
