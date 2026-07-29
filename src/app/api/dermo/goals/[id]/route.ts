import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getDermoSession()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { progress, is_active, notes } = await req.json()

    if (progress === undefined && is_active === undefined && notes === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    let result
    if (progress !== undefined) {
      result = await sql`
        UPDATE dermo_user_goals SET progress = ${progress}, updated_at = NOW()
        WHERE id = ${id} AND user_email = ${user.email}
        RETURNING id, goal_type, target_date::text, progress, notes, is_active, created_at::text
      `
    } else if (is_active !== undefined) {
      result = await sql`
        UPDATE dermo_user_goals SET is_active = ${is_active}, updated_at = NOW()
        WHERE id = ${id} AND user_email = ${user.email}
        RETURNING id, goal_type, target_date::text, progress, notes, is_active, created_at::text
      `
    } else {
      result = await sql`
        UPDATE dermo_user_goals SET notes = ${notes}, updated_at = NOW()
        WHERE id = ${id} AND user_email = ${user.email}
        RETURNING id, goal_type, target_date::text, progress, notes, is_active, created_at::text
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ goal: result[0] })
  } catch (err: any) {
    console.error('update goal error:', err)
    return NextResponse.json({ error: 'Error al actualizar objetivo' }, { status: 500 })
  }
}
