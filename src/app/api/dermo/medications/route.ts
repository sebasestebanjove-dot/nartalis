import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

// Blacklists for compatibility analysis
const FOTOSENSIBILIDAD_MARKERS = ['retinol', 'tretinoina', 'adapaleno', 'acido glicolico', 'acido salicilico', 'peroxido benzoilo', 'vitamina a', 'isotretinoina', 'ácido glicólico', 'ácido salicílico', 'peróxido benzoílo']
const IRRITACION_MARKERS = ['retinol', 'acido glicolico', 'acido salicilico', 'peroxido benzoilo', 'vitamina c', 'acido ferulico', 'ácido glicólico', 'ácido salicílico', 'peróxido benzoílo', 'ácido ferúlico']
const SEQUEDAD_MARKERS = ['retinol', 'peroxido benzoilo', 'acido salicilico', 'alcohol denat', 'acido azelaico', 'peróxido benzoílo', 'ácido salicílico', 'ácido azelaico']

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function analyzeCompatibility(
  activeIngredient: string,
  routineProducts: { productName: string; step: string }[]
): { fotosensibilidad: boolean; irritacion: boolean; sequedad: boolean; compatible: boolean; details: string[] } {
  const details: string[] = []
  const normIngredient = normalize(activeIngredient)

  let fotosensibilidad = false
  let irritacion = false
  let sequedad = false

  // Check if the medication itself is in any blacklist
  if (FOTOSENSIBILIDAD_MARKERS.some(m => normalize(m).includes(normIngredient) || normIngredient.includes(normalize(m)))) {
    fotosensibilidad = true
    details.push('Este medicamento puede causar fotosensibilidad. Evita exposición solar sin protección.')
  }

  if (IRRITACION_MARKERS.some(m => normalize(m).includes(normIngredient) || normIngredient.includes(normalize(m)))) {
    irritacion = true
    details.push('Este medicamento puede irritar la piel combinado con activos cosméticos.')
  }

  if (SEQUEDAD_MARKERS.some(m => normalize(m).includes(normIngredient) || normIngredient.includes(normalize(m)))) {
    sequedad = true
    details.push('Este medicamento puede resecar la piel. Usa hidratante reparadora.')
  }

  // Check against routine products
  for (const product of routineProducts) {
    const normProduct = normalize(product.productName)
    const step = product.step.toLowerCase()

    if (FOTOSENSIBILIDAD_MARKERS.some(m => normProduct.includes(normalize(m)))) {
      if (!fotosensibilidad) {
        fotosensibilidad = true
        details.push(`El producto "${product.productName}" (${product.step}) puede aumentar la fotosensibilidad.`)
      }
    }

    if (IRRITACION_MARKERS.some(m => normProduct.includes(normalize(m)))) {
      if (!irritacion) {
        irritacion = true
        details.push(`El producto "${product.productName}" (${product.step}) puede causar irritación combinado con tu medicación.`)
      }
    }
  }

  const compatible = !fotosensibilidad && !irritacion && !sequedad
  if (compatible) {
    details.push('No se detectaron interacciones significativas entre tu medicación y tu rutina cosmética.')
  }

  return { fotosensibilidad, irritacion, sequedad, compatible, details }
}

async function fetchCimaData(medicineName: string): Promise<{ activeIngredient?: string; atcCode?: string }> {
  try {
    const res = await fetch(
      `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(medicineName)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return {}

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return {}

    const first = data[0]
    return {
      activeIngredient: first.pactivos || first.activeIngredient || undefined,
      atcCode: first.atc || first.atcCode || undefined,
    }
  } catch {
    return {}
  }
}

export async function GET() {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const medications = await sql`
      SELECT * FROM dermo_user_medications
      WHERE user_email = ${user.email} AND is_active = true
      ORDER BY created_at DESC
    `

    return NextResponse.json({ medications })
  } catch (err: any) {
    console.error('Medications GET error:', err)
    return NextResponse.json({ error: 'Error al obtener medicamentos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const { medicine_name, active_ingredient, atc_code } = await req.json()

    if (!medicine_name) {
      return NextResponse.json({ error: 'Falta el nombre del medicamento' }, { status: 400 })
    }

    // Try to auto-fetch from CIMA if active_ingredient is not provided
    let resolvedIngredient = active_ingredient
    let resolvedAtc = atc_code

    if (!resolvedIngredient) {
      const cimaData = await fetchCimaData(medicine_name)
      resolvedIngredient = cimaData.activeIngredient || medicine_name
      resolvedAtc = cimaData.atcCode || atc_code
    }

    // Get user's active routine for compatibility analysis
    const [activeRoutine] = await sql`
      SELECT am_routine, pm_routine FROM dermo_user_routines
      WHERE user_email = ${user.email} AND (status = 'active' OR status IS NULL)
      ORDER BY status ASC, generated_at DESC LIMIT 1
    `

    const routineProducts: { productName: string; step: string }[] = []
    if (activeRoutine) {
      const am = typeof activeRoutine.am_routine === 'string' ? JSON.parse(activeRoutine.am_routine) : (activeRoutine.am_routine || [])
      const pm = typeof activeRoutine.pm_routine === 'string' ? JSON.parse(activeRoutine.pm_routine) : (activeRoutine.pm_routine || [])
      routineProducts.push(...am.map((p: any) => ({ productName: p.productName, step: p.step })))
      routineProducts.push(...pm.map((p: any) => ({ productName: p.productName, step: p.step })))
    }

    const compatibility = analyzeCompatibility(resolvedIngredient || medicine_name, routineProducts)

    const [inserted] = await sql`
      INSERT INTO dermo_user_medications (user_email, medicine_name, active_ingredient, atc_code, compatibility_result)
      VALUES (${user.email}, ${medicine_name}, ${resolvedIngredient || null}, ${resolvedAtc || null},
        ${JSON.stringify(compatibility)})
      RETURNING *
    `

    // Log KPIs
    await sql`
      INSERT INTO dermo_kpi_events (user_email, event_name, event_data)
      VALUES (${user.email}, 'medication_added', ${JSON.stringify({ medicine_name })})
    `
    await sql`
      INSERT INTO dermo_kpi_events (user_email, event_name, event_data)
      VALUES (${user.email}, 'compatibility_analysis_executed', ${JSON.stringify({ medicine_name, compatible: compatibility.compatible })})
    `

    return NextResponse.json({
      medication: inserted,
      compatibility,
    })
  } catch (err: any) {
    console.error('Medications POST error:', err)
    return NextResponse.json({ error: 'Error al añadir medicamento' }, { status: 500 })
  }
}
