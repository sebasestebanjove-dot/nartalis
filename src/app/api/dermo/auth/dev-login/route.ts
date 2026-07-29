import { NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { sql } from '@/lib/db'

const DEV_USERS = [
  { email: 'nopremium@nopremium.com', name: 'Test No Premium', isPremium: false },
  { email: 'premium@premium.com', name: 'Test Premium', isPremium: true },
]

const SESSION_MAX_AGE = 60 * 60 * 24 * 30

function signToken(secret: string, payload: Record<string, any>, maxAge: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + maxAge,
  })).toString('base64url')
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

export async function GET(req: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const url = new URL(req.url)
  const emailParam = url.searchParams.get('email')?.toLowerCase().trim()

  if (!emailParam || !DEV_USERS.some(u => u.email === emailParam)) {
    return NextResponse.json({
      error: 'Email no válido. Usa: nopremium@nopremium.com o premium@premium.com',
      valid: DEV_USERS.map(u => u.email),
    }, { status: 400 })
  }

  const cfg = DEV_USERS.find(u => u.email === emailParam)!
  const secret = process.env.NEXTAUTH_SECRET!
  if (!secret) return NextResponse.json({ error: 'NEXTAUTH_SECRET not set' }, { status: 500 })

  try {
    const existing = await sql`
      SELECT id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
      FROM dermo_users WHERE email = ${cfg.email}
    `

    let user: any
    if (existing.length > 0) {
      user = existing[0]
    } else {
      const [inserted] = await sql`
        INSERT INTO dermo_users (name, email, password_hash, auth_provider, codigo_postal, is_premium, consultas_consumidas)
        VALUES (${cfg.name}, ${cfg.email}, NULL, 'dev', '28001', ${cfg.isPremium}, 0)
        RETURNING id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
      `
      user = inserted
    }

    // Mirror into ia_module_users
    const iaExisting = await sql`SELECT id FROM ia_module_users WHERE email = ${cfg.email}`
    if (iaExisting.length === 0) {
      await sql`
        INSERT INTO ia_module_users (name, email, auth_provider, role, codigo_postal, is_premium, consultas_consumidas)
        VALUES (${cfg.name}, ${cfg.email}, 'dev', 'USER', '28001', ${cfg.isPremium}, 0)
      `
    }

    const isSecure = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.VERCEL_ENV === 'production'

    // Build dermo_session token
    const dermoTok = signToken(secret, {
      id: user.id,
      email: user.email,
      name: user.name,
      is_premium: !!user.is_premium,
      consultas_consumidas: user.consultas_consumidas ?? 0,
    }, SESSION_MAX_AGE)

    // Build ia_module_session token
    const [iaUser] = await sql`
      SELECT id, name, email, auth_provider, role, created_at::text, codigo_postal, needs_codigo_postal, is_premium, consultas_consumidas
      FROM ia_module_users WHERE email = ${cfg.email}
    `

    // Create redirect response & set cookies on it
    const response = NextResponse.redirect(new URL('/farma/dermo', req.url))

    response.cookies.set('dermo_session', dermoTok, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })

    if (iaUser) {
      const iaTok = signToken(secret, {
        id: iaUser.id,
        email: iaUser.email,
        name: iaUser.name,
        role: iaUser.role,
        codigo_postal: iaUser.codigo_postal,
        needs_codigo_postal: iaUser.needs_codigo_postal,
        is_premium: !!iaUser.is_premium,
        consultas_consumidas: iaUser.consultas_consumidas ?? 0,
      }, 60 * 60 * 24 * 7)

      response.cookies.set('ia_module_session', iaTok, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/ia-modulo',
        maxAge: 60 * 60 * 24 * 7,
      })
    }

    return response
  } catch (err: any) {
    console.error('dev-login error:', err)
    return NextResponse.json({ error: 'Error al iniciar sesión de desarrollo' }, { status: 500 })
  }
}
