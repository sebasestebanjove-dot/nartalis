import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'
import { dermoChat } from '@/lib/ai/dermoChat'

export async function GET() {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const [travel] = await sql`
      SELECT * FROM dermo_travel_profiles
      WHERE user_email = ${user.email} AND is_active = true
      ORDER BY created_at DESC LIMIT 1
    `

    if (!travel) return NextResponse.json({ travel: null })

    const today = new Date()
    const end = new Date(travel.end_date)
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

    return NextResponse.json({
      travel: {
        id: travel.id,
        destination: travel.destination,
        travel_type: travel.travel_type,
        start_date: travel.start_date,
        end_date: travel.end_date,
        days_left: daysLeft,
        generated_routine: travel.generated_routine,
      }
    })
  } catch (err: any) {
    console.error('Travel GET error:', err)
    return NextResponse.json({ error: 'Error al obtener viaje' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const { destination, travel_type, start_date, end_date } = await req.json()

    if (!destination || !travel_type || !start_date || !end_date) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const prompt = `Eres un asesor experto en dermofarmacia. Genera una rutina de cuidado facial adaptada para un viaje.

Datos del viaje:
- Destino: ${destination}
- Tipo de viaje: ${travel_type}
- Fecha inicio: ${start_date}
- Fecha fin: ${end_date}

Considera: clima del destino, exposición solar, cambio de agua, jet lag, y productos en formato viaje (tamaños TSA-compatibles).

Responde SOLO con un objeto JSON válido (sin markdown, sin explicación extra):
{
  "am_routine": [
    { "step": "Limpieza", "productName": "Marca + nombre corto viaje (máx 45 caracteres)", "order": 1 },
    { "step": "Sérum", "productName": "Marca + nombre corto viaje", "order": 2 },
    { "step": "Hidratante", "productName": "Marca + nombre corto viaje", "order": 3 },
    { "step": "Protección solar", "productName": "Marca + nombre corto viaje", "order": 4 }
  ],
  "pm_routine": [
    { "step": "Desmaquillante", "productName": "Marca + nombre corto viaje", "order": 1 },
    { "step": "Limpieza", "productName": "Marca + nombre corto viaje", "order": 2 },
    { "step": "Sérum reparador", "productName": "Marca + nombre corto viaje", "order": 3 },
    { "step": "Hidratante reparadora", "productName": "Marca + nombre corto viaje", "order": 4 }
  ],
  "explanation": "Texto explicativo en español sobre adaptación al clima y recomendaciones de viaje, máximo 3 párrafos."
}`

    let routineData: any
    try {
      const result = await dermoChat(
        { query: prompt, productContext: 'Eres un asesor experto en dermofarmacia especializado en rutinas de viaje.' },
        user.email
      )

      try {
        let cleaned = result.content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1)
        routineData = JSON.parse(cleaned)
      } catch {
        routineData = null
      }
    } catch {
      routineData = null
    }

    if (!routineData || !routineData.am_routine) {
      routineData = {
        am_routine: [
          { step: 'Limpieza', productName: 'Limpiador suave para viaje', order: 1 },
          { step: 'Hidratante', productName: 'Hidratante ligera SPF', order: 2 },
          { step: 'Protección solar', productName: 'Protector solar SPF50+', order: 3 },
        ],
        pm_routine: [
          { step: 'Desmaquillante', productName: 'Agua micelar', order: 1 },
          { step: 'Limpieza', productName: 'Limpiador facial', order: 2 },
          { step: 'Hidratante', productName: 'Crema reparadora nocturna', order: 3 },
        ],
        explanation: 'Disfruta de tu viaje a ' + destination + '. Recuerda proteger tu piel del sol y mantenerla hidratada.',
      }
    }

    // Archive active routine first (Modo Vacaciones replaces active)
    await sql`
      UPDATE dermo_user_routines
      SET status = 'archived', updated_at = NOW()
      WHERE user_email = ${user.email} AND (status = 'active' OR status IS NULL)
    `

    // Archive any previous active travel
    await sql`
      UPDATE dermo_travel_profiles
      SET is_active = false
      WHERE user_email = ${user.email} AND is_active = true
    `

    // Create travel profile with generated routine
    const [inserted] = await sql`
      INSERT INTO dermo_travel_profiles (user_email, destination, travel_type, start_date, end_date, generated_routine, is_active)
      VALUES (${user.email}, ${destination}, ${travel_type}, ${start_date}, ${end_date},
        ${JSON.stringify(routineData)}, true)
      RETURNING id
    `

    // Also save as a user routine so it appears in "Mi Rutina de Hoy"
    await sql`
      INSERT INTO dermo_user_routines (user_email, skin_type, allergies, goals, am_routine, pm_routine, explanation, is_completed, name)
      VALUES (${user.email}, 'viaje', ARRAY[]::text[], ARRAY[]::text[],
        ${JSON.stringify(routineData.am_routine || [])},
        ${JSON.stringify(routineData.pm_routine || [])},
        ${'✈️ Rutina de viaje: ' + destination + ' (' + travel_type + ')'}, true,
        ${'Viaje a ' + destination})
    `

    // Log KPI
    await sql`
      INSERT INTO dermo_kpi_events (user_email, event_name, event_data)
      VALUES (${user.email}, 'vacation_plan_generated', ${JSON.stringify({ destination, travel_type })})
    `

    return NextResponse.json({
      id: inserted?.id,
      destination,
      travel_type,
      start_date,
      end_date,
      generated_routine: routineData,
    })
  } catch (err: any) {
    console.error('Travel POST error:', err)
    return NextResponse.json({ error: 'Error al generar viaje: ' + (err.message || 'Error interno') }, { status: 500 })
  }
}

export async function DELETE() {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    // Deactivate travel profile
    await sql`
      UPDATE dermo_travel_profiles
      SET is_active = false
      WHERE user_email = ${user.email} AND is_active = true
    `

    // Find most recent archived routine and restore it
    const [archivedRoutine] = await sql`
      SELECT id FROM dermo_user_routines
      WHERE user_email = ${user.email} AND status = 'archived'
      ORDER BY updated_at DESC LIMIT 1
    `

    // Archive the travel routine itself
    await sql`
      UPDATE dermo_user_routines
      SET status = 'archived', updated_at = NOW()
      WHERE user_email = ${user.email} AND skin_type = 'viaje' AND status = 'active'
    `

    if (archivedRoutine) {
      await sql`
        UPDATE dermo_user_routines
        SET status = 'active', updated_at = NOW()
        WHERE id = ${archivedRoutine.id}
      `
    }

    // Log KPI
    await sql`
      INSERT INTO dermo_kpi_events (user_email, event_name, event_data)
      VALUES (${user.email}, 'vacation_mode_cancelled', ${JSON.stringify({ restored_routine: !!archivedRoutine })})
    `

    return NextResponse.json({
      ok: true,
      restored: !!archivedRoutine,
    })
  } catch (err: any) {
    console.error('Travel DELETE error:', err)
    return NextResponse.json({ error: 'Error al cancelar viaje' }, { status: 500 })
  }
}
