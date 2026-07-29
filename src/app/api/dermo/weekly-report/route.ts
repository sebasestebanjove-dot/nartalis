import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function GET() {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const [report] = await sql`
      SELECT * FROM dermo_weekly_reports
      WHERE user_email = ${user.email}
      ORDER BY year DESC, week_number DESC LIMIT 1
    `

    if (!report) {
      return NextResponse.json({ report: null })
    }

    return NextResponse.json({
      report: {
        id: report.id,
        week_number: report.week_number,
        year: report.year,
        report_json: report.report_json,
        score_before: report.score_before,
        score_after: report.score_after,
        completion_rate: Number(report.completion_rate),
        created_at: report.created_at,
      }
    })
  } catch (err: any) {
    console.error('Weekly report GET error:', err)
    return NextResponse.json({ error: 'Error al obtener informe semanal' }, { status: 500 })
  }
}
