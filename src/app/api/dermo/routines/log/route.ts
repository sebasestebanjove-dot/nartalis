import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { total_items, completed_items, log_date } = body
    const userEmail = user.email
    const today = log_date || new Date().toISOString().split('T')[0]
    const isCompleted = total_items > 0 && completed_items >= total_items

    // Upsert: insert or update today's log
    await sql`
      INSERT INTO dermo_routine_logs (user_email, log_date, total_items, completed_items, is_completed)
      VALUES (${userEmail}, ${today}, ${total_items}, ${completed_items}, ${isCompleted})
      ON CONFLICT (user_email, log_date)
      DO UPDATE SET
        completed_items = EXCLUDED.completed_items,
        is_completed = EXCLUDED.is_completed,
        total_items = EXCLUDED.total_items
    `

    // Count total unique completed days for streak
    const [streakRow] = await sql`
      SELECT COUNT(*)::int as streak
      FROM dermo_routine_logs
      WHERE user_email = ${userEmail} AND is_completed = true
    `
    const streak = streakRow?.streak ?? 0

    return NextResponse.json({ ok: true, streak, is_completed: isCompleted })
  } catch (err: any) {
    console.error('Routine log error:', err)
    return NextResponse.json({ error: 'Error al registrar' }, { status: 500 })
  }
}
