import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function GET() {
  try {
    const user = await getDermoSession()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const goals = await sql`
      SELECT id, goal_type, target_date::text, progress, notes, is_active, created_at::text
      FROM dermo_user_goals
      WHERE user_email = ${user.email}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ goals })
  } catch (err: any) {
    console.error('goals error:', err)
    return NextResponse.json({ error: 'Error al cargar objetivos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getDermoSession()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { goal_type, target_date, notes } = await req.json()
    if (!goal_type) return NextResponse.json({ error: 'goal_type is required' }, { status: 400 })

    const result = await sql`
      INSERT INTO dermo_user_goals (user_email, goal_type, target_date, notes)
      VALUES (${user.email}, ${goal_type}, ${target_date || null}, ${notes || null})
      RETURNING id, goal_type, target_date::text, progress, notes, is_active, created_at::text
    `

    return NextResponse.json({ goal: result[0] })
  } catch (err: any) {
    console.error('create goal error:', err)
    return NextResponse.json({ error: 'Error al crear objetivo' }, { status: 500 })
  }
}
