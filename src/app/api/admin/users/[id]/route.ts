import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'

interface RouteCtx {
  params: Promise<{ id: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// GET /api/admin/users/[id] — detalle administrativo + actividad.
// NUNCA devuelve password_hash, google_id, apple_sub, tokens ni secretos.
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: adminUnauthorized(guard.reason).error }, { status: adminUnauthorized(guard.reason).status })
  }

  const { id } = await params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const [user] = await sql`
      SELECT id, name, email, primary_provider, plan, role, status,
             created_at::text AS created_at, updated_at::text AS updated_at,
             last_login_at::text AS last_login_at
      FROM nartalis_users
      WHERE id = ${id}
    `
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const [meds] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM nartalis_user_medicamentos WHERE user_id = ${id}) AS saved,
        (SELECT COUNT(*)::int FROM nartalis_user_medicamentos WHERE user_id = ${id} AND is_favorite) AS favorites
    `
    const consultas = await sql`
      SELECT nregistro, nombre, consulted_at::text AS consulted_at
      FROM nartalis_user_consultas WHERE user_id = ${id}
      ORDER BY consulted_at DESC LIMIT 50
    `
    const [searchStats] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM farma_search_log WHERE user_id = ${id}) AS total_searches,
        (SELECT COUNT(*)::int FROM farma_search_log WHERE user_id = ${id} AND search_type = 'text') AS text_searches,
        (SELECT COUNT(*)::int FROM farma_search_log WHERE user_id = ${id} AND search_type = 'voice') AS voice_searches,
        (SELECT MAX(created_at)::text FROM farma_search_log WHERE user_id = ${id}) AS last_search_at,
        (SELECT MAX(last_login_at)::text FROM nartalis_users WHERE id = ${id}) AS last_activity_at
    `

    return NextResponse.json({
      ok: true,
      data: {
        user,
        meds,
        consultas,
        searchStats,
      },
    })
  } catch (err) {
    console.error('admin user detail error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] — SOLO status (ACTIVE|DISABLED) y plan (FREE|PREMIUM).
// Rechaza cualquier intento de modificar role, email, password, proveedor, etc.
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: adminUnauthorized(guard.reason).error }, { status: adminUnauthorized(guard.reason).status })
  }

  const { id } = await params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const payload = body as Record<string, unknown>

  // Seguridad: role y campos sensibles nunca se pueden modificar vía PATCH.
  const FORBIDDEN = ['role', 'email', 'password', 'password_hash', 'google_id', 'apple_sub', 'primary_provider', 'id', 'created_at', 'updated_at']
  for (const key of FORBIDDEN) {
    if (key in payload) {
      return NextResponse.json({ error: 'Campo no permitido' }, { status: 403 })
    }
  }

  const allowedKeys = Object.keys(payload).filter((k) => k === 'status' || k === 'plan')
  if (allowedKeys.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const updates: string[] = []
  const values: unknown[] = []
  let i = 1
  if ('status' in payload) {
    if (payload.status !== 'ACTIVE' && payload.status !== 'DISABLED') {
      return NextResponse.json({ error: 'status debe ser ACTIVE o DISABLED' }, { status: 400 })
    }
    updates.push(`status = $${i++}`)
    values.push(payload.status)
  }
  if ('plan' in payload) {
    if (payload.plan !== 'FREE' && payload.plan !== 'PREMIUM') {
      return NextResponse.json({ error: 'plan debe ser FREE o PREMIUM' }, { status: 400 })
    }
    updates.push(`plan = $${i++}`)
    values.push(payload.plan)
  }

  try {
    const [check] = await sql`SELECT id FROM nartalis_users WHERE id = ${id}`
    if (!check) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const [updated] = await sql.query(
      `UPDATE nartalis_users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING id, name, email, plan, role, status`,
      [...values, id],
    )
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('admin user patch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
