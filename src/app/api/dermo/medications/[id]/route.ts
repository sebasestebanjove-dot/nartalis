import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { is_active } = await req.json()

    const [updated] = await sql`
      UPDATE dermo_user_medications
      SET is_active = ${is_active ?? true}, updated_at = NOW()
      WHERE id = ${id} AND user_email = ${user.email}
      RETURNING *
    `

    if (!updated) return NextResponse.json({ error: 'Medicamento no encontrado' }, { status: 404 })
    return NextResponse.json({ medication: updated })
  } catch (err: any) {
    console.error('Medication PATCH error:', err)
    return NextResponse.json({ error: 'Error al actualizar medicamento' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    await sql`
      UPDATE dermo_user_medications SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND user_email = ${user.email}
    `
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Medication DELETE error:', err)
    return NextResponse.json({ error: 'Error al eliminar medicamento' }, { status: 500 })
  }
}
