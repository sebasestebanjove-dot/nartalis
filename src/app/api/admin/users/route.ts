import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'

// GET /api/admin/users — listado de usuarios con filtros y paginación.
// Params: q, plan, status, provider, limit (≤100, default 25), offset.
// NUNCA devuelve password_hash, google_id, apple_sub, tokens ni secretos.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: adminUnauthorized(guard.reason).error }, { status: adminUnauthorized(guard.reason).status })
  }

  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') || '').trim().slice(0, 100)
  const plan = sp.get('plan')
  const status = sp.get('status')
  const provider = sp.get('provider')
  const rawLimit = Number.parseInt(sp.get('limit') || '25', 10)
  const limit = Number.isNaN(rawLimit) ? 25 : Math.min(100, Math.max(1, rawLimit))
  const rawOffset = Number.parseInt(sp.get('offset') || '0', 10)
  const offset = Number.isNaN(rawOffset) ? 0 : Math.max(0, rawOffset)

  try {
    const where = []
    const params: unknown[] = []
    let i = 1
    if (q) {
      params.push(`%${q}%`)
      where.push(`(name ILIKE $${i++} OR email ILIKE $${i - 1})`)
    }
    if (plan === 'FREE' || plan === 'PREMIUM') { params.push(plan); where.push(`plan = $${i++}`) }
    if (status === 'ACTIVE' || status === 'DISABLED') { params.push(status); where.push(`status = $${i++}`) }
    if (provider === 'email' || provider === 'google' || provider === 'apple') { params.push(provider); where.push(`primary_provider = $${i++}`) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const rows = await sql.query(
      `SELECT u.id, u.name, u.email, u.primary_provider, u.plan, u.role, u.status,
              u.created_at::text AS created_at, u.last_login_at::text AS last_login_at,
              (SELECT COUNT(*)::int FROM nartalis_user_medicamentos m WHERE m.user_id = u.id) AS medication_count,
              (SELECT COUNT(*)::int FROM nartalis_user_consultas c WHERE c.user_id = u.id) AS consultation_count
       FROM nartalis_users u
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    )

    const [countRows] = await sql.query(
      `SELECT COUNT(*)::int AS total FROM nartalis_users u ${whereSql}`,
      params,
    )
    const total = Number(countRows?.total || 0)

    return NextResponse.json({ ok: true, data: rows, total, limit, offset })
  } catch (err) {
    console.error('admin users error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
