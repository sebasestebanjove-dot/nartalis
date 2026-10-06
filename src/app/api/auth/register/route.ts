import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { hashPassword, createNartalisSession } from '@/lib/auth'
import { linkAnonymousToUser } from '@/lib/identity'

const ANONYMOUS_ID_COOKIE = 'nartalis_anon_id'
const SESSION_ID_COOKIE = 'nartalis_session_id'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name) {
      return NextResponse.json({ error: 'Introduce tu nombre' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ error: 'Introduce tu correo electrónico' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'Introduce una contraseña' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const existing = await sql`SELECT id FROM nartalis_users WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este correo.' },
        { status: 409 },
      )
    }

    const [user] = await sql`
      INSERT INTO nartalis_users (name, email, password_hash, primary_provider)
      VALUES (${name}, ${email}, ${hashPassword(password)}, 'email')
      RETURNING id, name, email, avatar_url, primary_provider, google_id, apple_sub,
                status, plan, role, email_verified, created_at::text, last_login_at::text
    `

    await sql`UPDATE nartalis_users SET last_login_at = NOW() WHERE id = ${user.id}`

    // Obtener tracking IDs de las cookies ANTES de crear la sesión (que puede sobrescribir cookies)
    const cookieStore = await cookies()
    const anonymousId = cookieStore.get('nartalis_anon_id')?.value ?? null
    const visitorId = null // visitor_id viene de localStorage client-side, no de cookie

    await createNartalisSession(user)

    // Vincular identidad anónima al nuevo usuario registrado
    if (anonymousId) {
      try {
        await sql.query(
          `INSERT INTO nartalis_identity_map (anonymous_id, visitor_id, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (anonymous_id, user_id) DO NOTHING`,
          [anonymousId, null, user.id]
        )
      } catch { /* silencioso */ }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('nartalis register error:', err)
    return NextResponse.json(
      { error: 'No se pudo completar el registro. Inténtalo de nuevo.' },
      { status: 500 },
    )
  }
}