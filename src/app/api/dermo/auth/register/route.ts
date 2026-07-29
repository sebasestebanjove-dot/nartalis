import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword, createDermoSession } from '@/lib/dermo-auth'

export async function POST(req: Request) {
  try {
    const { name, email, password, codigoPostal, isPremium } = await req.json()

    if (!name || !email || !password || !codigoPostal) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existing = await sql`
      SELECT id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
      FROM dermo_users WHERE email = ${normalizedEmail}
    `
    if (existing.length > 0) {
      const u = existing[0]
      await createDermoSession({
        id: u.id,
        name: u.name,
        email: u.email,
        auth_provider: u.auth_provider,
        codigo_postal: u.codigo_postal,
        is_premium: !!u.is_premium,
        consultas_consumidas: u.consultas_consumidas ?? 0,
        created_at: u.created_at,
      })
      return NextResponse.json({ ok: true, isNew: false, email: normalizedEmail })
    }

    const premium = !!isPremium
    const passwordHash = hashPassword(password)
    const [user] = await sql`
      INSERT INTO dermo_users (name, email, password_hash, auth_provider, codigo_postal, is_premium, consultas_consumidas)
      VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash}, 'email', ${codigoPostal.trim()}, ${premium}, 0)
      RETURNING id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
    `

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

    // ── Also create user in ia_module_users for dashboard access ──
    const { createSession } = await import('@/lib/ia-module/auth')
    const iaExisting = await sql`SELECT id FROM ia_module_users WHERE email = ${normalizedEmail}`
    if (iaExisting.length === 0) {
      await sql`
        INSERT INTO ia_module_users (name, email, auth_provider, role, codigo_postal, is_premium, consultas_consumidas)
        VALUES (${name.trim()}, ${normalizedEmail}, 'email', 'USER', ${codigoPostal.trim()}, ${premium}, 0)
      `

      const [iaUser] = await sql`
        SELECT id, name, email, auth_provider, role, created_at::text, codigo_postal, needs_codigo_postal, is_premium, consultas_consumidas
        FROM ia_module_users WHERE email = ${normalizedEmail}
      `
      if (iaUser) {
        await createSession({
          id: iaUser.id,
          name: iaUser.name,
          email: iaUser.email,
          auth_provider: iaUser.auth_provider,
          role: iaUser.role as 'USER' | 'SUPER_ADMIN',
          created_at: iaUser.created_at,
          codigo_postal: iaUser.codigo_postal,
          needs_codigo_postal: iaUser.needs_codigo_postal ?? false,
          is_premium: !!iaUser.is_premium,
          consultas_consumidas: iaUser.consultas_consumidas ?? 0,
        })
      }
    }

    return NextResponse.json({ ok: true, isNew: true, email: normalizedEmail })
  } catch (err: any) {
    console.error('dermo register error:', err)
    return NextResponse.json({ error: 'Error al registrar' }, { status: 500 })
  }
}
