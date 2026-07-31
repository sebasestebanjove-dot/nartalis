import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { createNartalisSession, NARTALIS_USER_COLUMNS, type NartalisUserRow } from '@/lib/auth'

interface GoogleUserInfo {
  id?: string | number
  email?: string
  name?: string
  given_name?: string
  picture?: string
  verified_email?: boolean
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(new URL('/login?auth=error&provider=google', req.url))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?auth=error&provider=google', req.url))
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/auth/callback/google`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = (await tokenRes.json()) as { access_token?: string }
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/login?auth=error&provider=google', req.url))
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const googleUser = (await userRes.json()) as GoogleUserInfo

    const email = (googleUser.email || '').toLowerCase().trim()
    if (!email) {
      return NextResponse.redirect(new URL('/login?auth=error&provider=google', req.url))
    }

    const name = googleUser.name || googleUser.given_name || email.split('@')[0]
    const avatar = googleUser.picture || null
    const googleId = googleUser.id ? String(googleUser.id) : ''
    const emailVerified = !!googleUser.verified_email

    // ── Una sola cuenta Nartalis: buscar por google_id o por email ──
    let rows: NartalisUserRow[] = []
    if (googleId) {
      rows = (await sql`
        SELECT ${sql.unsafe(NARTALIS_USER_COLUMNS)}
        FROM nartalis_users WHERE google_id = ${googleId}
      `) as NartalisUserRow[]
    }
    if (rows.length === 0) {
      rows = (await sql`
        SELECT ${sql.unsafe(NARTALIS_USER_COLUMNS)}
        FROM nartalis_users WHERE email = ${email}
      `) as NartalisUserRow[]
    }

    let user: NartalisUserRow
    let created = false
    if (rows.length > 0) {
      user = rows[0]
      // Vincular google_id si la cuenta existía con email/contraseña (Google verifica el email).
      if (!user.google_id && googleId) {
        const [updated] = (await sql`
          UPDATE nartalis_users
          SET google_id = ${googleId},
              email_verified = TRUE,
              avatar_url = COALESCE(${avatar}, avatar_url),
              updated_at = NOW()
          WHERE id = ${user.id}
          RETURNING ${sql.unsafe(NARTALIS_USER_COLUMNS)}
        `) as NartalisUserRow[]
        user = updated
      }
    } else {
      const [createdUser] = (await sql`
        INSERT INTO nartalis_users (name, email, avatar_url, primary_provider, google_id, email_verified)
        VALUES (${name}, ${email}, ${avatar}, 'google', ${googleId || null}, ${emailVerified})
        RETURNING ${sql.unsafe(NARTALIS_USER_COLUMNS)}
      `) as NartalisUserRow[]
      user = createdUser
      created = true
    }

    await sql`UPDATE nartalis_users SET last_login_at = NOW() WHERE id = ${user.id}`
    await createNartalisSession(user)
    return NextResponse.redirect(
      new URL(`/espacio?auth=success&provider=google${created ? '&welcome=1' : ''}`, req.url),
    )
  } catch (err) {
    console.error('nartalis google callback error:', err)
    return NextResponse.redirect(new URL('/login?auth=error&provider=google', req.url))
  }
}
