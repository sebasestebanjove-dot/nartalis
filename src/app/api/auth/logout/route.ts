import { NextResponse } from 'next/server'
import { destroyNartalisSession } from '@/lib/auth'

export async function POST() {
  try {
    await destroyNartalisSession()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('nartalis logout error:', err)
    return NextResponse.json({ error: 'No se pudo cerrar sesión' }, { status: 500 })
  }
}
