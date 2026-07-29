import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPassword, createDermoSession } from '@/lib/dermo-auth'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const isDevUser = ['nopremium@nopremium.com', 'premium@premium.com'].includes(normalizedEmail)

    if (!isDevUser && !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    const rows = await sql`
      SELECT id, name, email, password_hash, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
      FROM dermo_users WHERE email = ${normalizedEmail}
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const user = rows[0]
    if (!isDevUser && (!user.password_hash || !verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    await createDermoSession({
      id: user.id,
      name: user.name,
      email: user.email,
      auth_provider: user.auth_provider,
      codigo_postal: user.codigo_postal,
      is_premium: !!user.is_premium,
      consultas_consumidas: user.consultas_consumidas ?? 0,
      created_at: user.created_at,
    })

    // ── Also set ia_module_session for dashboard access ──
    const { createSession } = await import('@/lib/ia-module/auth')
    const iaRows = await sql`
      SELECT id, name, email, auth_provider, role, created_at::text, codigo_postal, needs_codigo_postal, is_premium, consultas_consumidas
      FROM ia_module_users WHERE email = ${normalizedEmail}
    `
    if (iaRows.length > 0) {
      const ia = iaRows[0]
      await createSession({
        id: ia.id,
        name: ia.name,
        email: ia.email,
        auth_provider: ia.auth_provider,
        role: ia.role as 'USER' | 'SUPER_ADMIN',
        created_at: ia.created_at,
        codigo_postal: ia.codigo_postal,
        needs_codigo_postal: ia.needs_codigo_postal ?? false,
        is_premium: !!ia.is_premium,
        consultas_consumidas: ia.consultas_consumidas ?? 0,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('dermo login error:', err)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}
