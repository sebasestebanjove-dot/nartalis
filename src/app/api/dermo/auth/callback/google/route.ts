import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { createDermoSession } from '@/lib/dermo-auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state') || ''

    if (error || !code) {
      return NextResponse.redirect(new URL('/farma?error=google_denied', req.url))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/dermo/auth/callback/google`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/farma?error=token_exchange', req.url))
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const googleUser = await userRes.json()

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/farma?error=no_email', req.url))
    }

    const email = googleUser.email.toLowerCase().trim()
    const name = googleUser.name || googleUser.given_name || email.split('@')[0]

    // ── Create or get user in dermo_users ──
    const existing = await sql`
      SELECT id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
      FROM dermo_users WHERE email = ${email}
    `

    let user: any
    let isNew = false
    let needsCodigoPostal = false

    if (existing.length > 0) {
      user = existing[0]
    } else {
      isNew = true
      needsCodigoPostal = true
      const [newUser] = await sql`
        INSERT INTO dermo_users (name, email, auth_provider, is_premium, consultas_consumidas)
        VALUES (${name}, ${email}, 'google', false, 0)
        RETURNING id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
      `
      user = newUser
    }

    // ── Also ensure user exists in ia_module_users for dashboard access ──
    const iaExisting = await sql`SELECT id FROM ia_module_users WHERE email = ${email}`
    if (iaExisting.length === 0) {
      await sql`
        INSERT INTO ia_module_users (name, email, auth_provider, role, codigo_postal)
        VALUES (${user.name}, ${email}, 'google', 'USER', ${user.codigo_postal || ''})
      `
    }

    // ── Set dermo_session ──
    await createDermoSession({
      id: user.id,
      name: user.name,
      email: user.email,
      auth_provider: 'google',
      codigo_postal: user.codigo_postal,
      is_premium: !!user.is_premium,
      consultas_consumidas: user.consultas_consumidas ?? 0,
      created_at: user.created_at,
    })

    // ── Set ia_module_session ──
    const { createSession } = await import('@/lib/ia-module/auth')
    const iaUser = (await sql`
      SELECT id, name, email, auth_provider, role, created_at::text, codigo_postal, needs_codigo_postal, is_premium, consultas_consumidas
      FROM ia_module_users WHERE email = ${email}
    `)[0]
    if (iaUser) {
      await createSession({
        id: iaUser.id,
        name: iaUser.name,
        email: iaUser.email,
        auth_provider: iaUser.auth_provider,
        role: iaUser.role as 'USER' | 'SUPER_ADMIN',
        created_at: iaUser.created_at,
        codigo_postal: iaUser.codigo_postal,
        needs_codigo_postal: iaUser.needs_codigo_postal,
        is_premium: !!iaUser.is_premium,
        consultas_consumidas: iaUser.consultas_consumidas ?? 0,
      })
    }

    // ── Redirect ──
    if (isNew && !user.codigo_postal) {
      return NextResponse.redirect(new URL('/farma?google_pending=1', req.url))
    }
    return NextResponse.redirect(new URL('/ia-modulo/dashboard', req.url))
  } catch (err: any) {
    console.error('dermo google callback error:', err)
    return NextResponse.redirect(new URL('/farma?error=server_error', req.url))
  }
}
