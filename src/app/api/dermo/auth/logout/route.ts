import { NextResponse } from 'next/server'
import { destroyDermoSession } from '@/lib/dermo-auth'

export async function POST() {
  try {
    await destroyDermoSession()
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('dermo logout error:', err)
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}
