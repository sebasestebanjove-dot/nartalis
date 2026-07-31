import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_NOT_CONFIGURED' }, { status: 503 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback/google`
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'email profile')
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')

  return NextResponse.redirect(url)
}
