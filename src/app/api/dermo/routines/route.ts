import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function GET() {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const userEmail = user.email

    // Get active routine (status = 'active' or null for legacy)
    const [active] = await sql`
      SELECT id, user_email, skin_type, allergies, goals,
             am_routine::text, pm_routine::text, explanation, is_completed,
             name, status, generated_at::text as created_at
      FROM dermo_user_routines
      WHERE user_email = ${userEmail} AND (status = 'active' OR status IS NULL)
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, generated_at DESC
      LIMIT 1
    `

    // Get archived routine history
    const history = await sql`
      SELECT id, user_email, skin_type, allergies, goals,
             am_routine::text, pm_routine::text, explanation, is_completed,
             name, status, generated_at::text as created_at
      FROM dermo_user_routines
      WHERE user_email = ${userEmail} AND (status = 'archived' OR status IS NULL)
      ORDER BY generated_at DESC
      LIMIT 20
    `

    const parseRoutine = (r: any) => ({
      ...r,
      am_routine: typeof r.am_routine === 'string' ? JSON.parse(r.am_routine) : r.am_routine,
      pm_routine: typeof r.pm_routine === 'string' ? JSON.parse(r.pm_routine) : r.pm_routine,
    })

    return NextResponse.json({
      active: active ? parseRoutine(active) : null,
      history: history.map(parseRoutine),
    })
  } catch (err: any) {
    console.error('Get routines error:', err)
    return NextResponse.json({ error: 'Error al obtener rutinas' }, { status: 500 })
  }
}
