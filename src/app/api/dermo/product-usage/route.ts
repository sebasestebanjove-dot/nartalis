import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

const FREQUENCY_DAILY_MULTIPLIER: Record<string, number> = {
  '1_dia': 1,
  '2_dia': 2,
  '1_semana': 1 / 7,
  '2_semana': 2 / 7,
  '1_mes': 1 / 30,
}

function calculateUsage(sizeMl: number, frequency: string): number {
  const multiplier = FREQUENCY_DAILY_MULTIPLIER[frequency] || 1
  return Math.round((sizeMl * multiplier / 30) * 1000) / 1000
}

function calculateStatus(daysLeft: number): string {
  if (daysLeft <= 0) return 'critical'
  if (daysLeft <= 7) return 'critical'
  if (daysLeft <= 14) return 'warning'
  return 'ok'
}

export async function GET() {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const products = await sql`
      SELECT * FROM dermo_product_usage
      WHERE user_email = ${user.email} AND is_active = true
      ORDER BY estimated_finish_date ASC
    `

    const now = new Date()
    const result = products.map((p: any) => {
      const finishDate = p.estimated_finish_date ? new Date(p.estimated_finish_date) : null
      const daysLeft = finishDate ? Math.max(0, Math.ceil((finishDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
      return {
        id: p.id,
        product_name: p.product_name,
        product_id: p.product_id,
        size_ml: Number(p.size_ml),
        unit: p.unit || 'ml',
        use_frequency: p.use_frequency,
        daily_usage_ml: Number(p.daily_usage_ml),
        estimated_finish_date: p.estimated_finish_date,
        days_left: daysLeft,
        status: calculateStatus(daysLeft),
        created_at: p.created_at,
      }
    })

    return NextResponse.json({ products: result })
  } catch (err: any) {
    console.error('Product usage GET error:', err)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const { product_name, product_id, size_ml, use_frequency, unit } = await req.json()

    if (!product_name || !size_ml || !use_frequency) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const dailyMl = calculateUsage(Number(size_ml), use_frequency)
    const daysToFinish = dailyMl > 0 ? Math.ceil(Number(size_ml) / dailyMl) : 30
    const estimatedFinish = new Date()
    estimatedFinish.setDate(estimatedFinish.getDate() + daysToFinish)
    const status = calculateStatus(daysToFinish)

    const [inserted] = await sql`
      INSERT INTO dermo_product_usage (user_email, product_id, product_name, size_ml, unit, use_frequency, daily_usage_ml, estimated_finish_date, status)
      VALUES (${user.email}, ${product_id || null}, ${product_name}, ${Number(size_ml)}, ${unit || 'ml'}, ${use_frequency}, ${dailyMl}, ${estimatedFinish.toISOString().split('T')[0]}, ${status})
      RETURNING *
    `

    // Log KPI if critical/warning
    if (status === 'critical' || status === 'warning') {
      try {
        await sql`
          INSERT INTO dermo_kpi_events (user_email, event_name, event_data)
          VALUES (${user.email}, 'product_exhaustion_alert_generated', ${JSON.stringify({ product_name, days_left: daysToFinish })})
        `
      } catch {}
    }

    const finishDateInserted = estimatedFinish
    const daysLeftInserted = Math.max(0, Math.ceil((finishDateInserted.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

    return NextResponse.json({
      product: {
        ...inserted,
        size_ml: Number(inserted.size_ml),
        daily_usage_ml: Number(inserted.daily_usage_ml),
        days_left: daysLeftInserted,
      }
    })
  } catch (err: any) {
    console.error('Product usage POST error:', err)
    return NextResponse.json({ error: 'Error al registrar producto' }, { status: 500 })
  }
}
