import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { dermoChat } from '@/lib/ai/dermoChat'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const now = new Date()
    const weekNumber = getWeekNumber(now)
    const year = now.getFullYear()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get all premium users
    const premiumUsers = await sql`
      SELECT email, name FROM dermo_users WHERE is_premium = true
    `

    let generated = 0

    for (const user of premiumUsers) {
      try {
        // Get skin score history for the week
        const scoreHistory = await sql`
          SELECT score, recorded_at FROM dermo_skin_score_history
          WHERE user_email = ${user.email} AND recorded_at >= ${oneWeekAgo}
          ORDER BY recorded_at ASC
        `

        // Get routine completion for the week
        const [routineStats] = await sql`
          SELECT 
            COUNT(*)::int as total_days,
            COUNT(*) FILTER (WHERE is_completed = true)::int as completed_days
          FROM dermo_routine_logs
          WHERE user_email = ${user.email} AND log_date >= ${oneWeekAgo.toISOString().split('T')[0]}
        `

        // Get consultation count for the week
        const [consultStats] = await sql`
          SELECT COUNT(*)::int as count FROM dermo_consultations
          WHERE user_email = ${user.email} AND created_at >= ${oneWeekAgo}
        `

        // Get active alerts / medications
        const [medAlertCount] = await sql`
          SELECT COUNT(*)::int as count FROM dermo_user_medications
          WHERE user_email = ${user.email} AND is_active = true
        `

        const scoreBefore = scoreHistory.length > 0 ? scoreHistory[0].score : 50
        const scoreAfter = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].score : 50
        const completionRate = routineStats?.total_days > 0
          ? Math.round((routineStats.completed_days / routineStats.total_days) * 100)
          : 0

        // Generate IA coach report
        const prompt = `Eres un skin coach experto en dermofarmacia. Genera un informe semanal personalizado.

Datos del usuario para la semana ${weekNumber}/${year}:
- Skin Score inicio: ${scoreBefore}/100
- Skin Score fin: ${scoreAfter}/100
- Días con rutina completada: ${routineStats?.completed_days || 0}/${routineStats?.total_days || 0}
- Consultas realizadas: ${consultStats?.count || 0}
- Medicamentos activos: ${medAlertCount?.count || 0}

Responde SOLO con un objeto JSON (sin markdown):
{
  "summary": "Resumen semanal en 2-3 frases en español, tono motivador.",
  "insights": ["Insight 1 sobre evolución del Skin Score", "Insight 2 sobre constancia", "Insight 3 sobre consultas/medicamentos"],
  "recommendations": ["Recomendación 1 accionable", "Recomendación 2", "Recomendación 3"],
  "highlights": ["Logro destacado 1", "Logro destacado 2"]
}`

        const result = await dermoChat(
          { query: prompt, productContext: 'Eres un skin coach que genera informes semanales motivadores y personalizados.' },
          user.email
        )

        let reportJson
        try {
          let cleaned = result.content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
          const start = cleaned.indexOf('{')
          const end = cleaned.lastIndexOf('}')
          if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1)
          reportJson = JSON.parse(cleaned)
        } catch {
          reportJson = {
            summary: 'Esta semana tu piel ha mostrado buena progresión. Sigue siendo constante con tu rutina.',
            insights: ['Sigue usando protección solar a diario', 'La constancia es clave para ver resultados'],
            recommendations: ['Mantén tu rutina actual', 'Aumenta la hidratación si notas sequedad'],
            highlights: ['Completaste tu rutina varios días esta semana'],
          }
        }

        // Upsert weekly report
        await sql`
          INSERT INTO dermo_weekly_reports (user_email, week_number, year, report_json, score_before, score_after, completion_rate)
          VALUES (${user.email}, ${weekNumber}, ${year}, ${JSON.stringify(reportJson)}, ${scoreBefore}, ${scoreAfter}, ${completionRate})
          ON CONFLICT (user_email, week_number, year)
          DO UPDATE SET report_json = ${JSON.stringify(reportJson)}, score_before = ${scoreBefore}, score_after = ${scoreAfter}, completion_rate = ${completionRate}, created_at = NOW()
        `

        generated++
      } catch (userErr) {
        console.error('Error processing user:', user.email, userErr)
      }
    }

    return NextResponse.json({ ok: true, generated, total: premiumUsers.length })
  } catch (err: any) {
    console.error('Weekly coach cron error:', err)
    return NextResponse.json({ error: 'Error en generación de informes' }, { status: 500 })
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}
