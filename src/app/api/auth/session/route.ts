import { NextResponse } from 'next/server'
import { getNartalisSession, toPublicUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getNartalisSession()
    if (!user) {
      return NextResponse.json({ authenticated: false })
    }
    return NextResponse.json({
      authenticated: true,
      user: toPublicUser(user),
    })
  } catch (err) {
    console.error('nartalis session error:', err)
    return NextResponse.json({ authenticated: false })
  }
}
