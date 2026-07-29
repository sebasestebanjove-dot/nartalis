import { NextResponse } from 'next/server'
import { getDermoSession } from '@/lib/dermo-auth'

export async function GET() {
  try {
    const user = await getDermoSession()
    if (!user) {
      return NextResponse.json({ authenticated: false })
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_premium: user.is_premium,
        consultas_consumidas: user.consultas_consumidas,
      },
    })
  } catch (err: any) {
    console.error('dermo session error:', err)
    return NextResponse.json({ authenticated: false })
  }
}
