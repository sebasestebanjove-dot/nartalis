import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { event_name, event_data } = await req.json()
    if (!event_name) {
      return NextResponse.json({ error: 'Falta event_name' }, { status: 400 })
    }

    await sql`
      INSERT INTO dermo_kpi_events (user_email, event_name, event_data)
      VALUES (${user.email}, ${event_name}, ${event_data ? JSON.stringify(event_data) : null})
    `

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('KPI log error:', err)
    return NextResponse.json({ error: 'Error al registrar evento' }, { status: 500 })
  }
}
