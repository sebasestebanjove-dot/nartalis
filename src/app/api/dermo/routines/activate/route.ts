import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { routine_id, name } = body

  if (!routine_id) {
    return NextResponse.json({ error: 'Falta routine_id' }, { status: 400 })
  }

  try {
    const userEmail = user.email
    const routineName = name || `Rutina Personalizada ${new Date().toLocaleDateString('es-ES')}`

    // Set all existing active routines to archived
    await sql`
      UPDATE dermo_user_routines
      SET status = 'archived', updated_at = NOW()
      WHERE user_email = ${userEmail} AND status = 'active'
    `

    // Set this routine to active with given name
    await sql`
      UPDATE dermo_user_routines
      SET name = ${routineName}, status = 'active', updated_at = NOW()
      WHERE id = ${routine_id} AND user_email = ${userEmail}
    `

    // Fetch the updated routine
    const [updated] = await sql`
      SELECT id, user_email, skin_type, allergies, goals,
             am_routine::text, pm_routine::text, explanation, is_completed,
             name, status, generated_at::text as created_at
      FROM dermo_user_routines
      WHERE id = ${routine_id}
    `

    if (!updated) {
      return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      routine: {
        ...updated,
        am_routine: typeof updated.am_routine === 'string' ? JSON.parse(updated.am_routine) : updated.am_routine,
        pm_routine: typeof updated.pm_routine === 'string' ? JSON.parse(updated.pm_routine) : updated.pm_routine,
      },
    })
  } catch (err: any) {
    console.error('Activate routine error:', err)
    return NextResponse.json({ error: 'Error al activar rutina: ' + (err.message || 'Error interno') }, { status: 500 })
  }
}
