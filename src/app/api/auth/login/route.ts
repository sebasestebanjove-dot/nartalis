import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPassword, createNartalisSession } from '@/lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Introduce un correo electrónico válido' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'Introduce tu contraseña' }, { status: 400 })
    }

    const rows = await sql`
      SELECT id, name, email, avatar_url, primary_provider, google_id, apple_sub,
             status, plan, role, email_verified, password_hash, created_at::text, last_login_at::text
      FROM nartalis_users WHERE email = ${email}
    `

    if (rows.length === 0 || !rows[0].password_hash || !verifyPassword(password, rows[0].password_hash)) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })
    }

    const u = rows[0]
    if (u.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Esta cuenta no está activa' }, { status: 403 })
    }

    await sql`UPDATE nartalis_users SET last_login_at = NOW() WHERE id = ${u.id}`

    const [fresh] = await sql`
      SELECT id, name, email, avatar_url, primary_provider, google_id, apple_sub,
             status, plan, role, email_verified, created_at::text, last_login_at::text
      FROM nartalis_users WHERE id = ${u.id}
    `
    await createNartalisSession(fresh)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('nartalis login error:', err)
    return NextResponse.json({ error: 'No se pudo iniciar sesión. Inténtalo de nuevo.' }, { status: 500 })
  }
}
