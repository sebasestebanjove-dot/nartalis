import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'
import { dermoChat } from '@/lib/ai/dermoChat'

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!user.is_premium) {
    return NextResponse.json({ error: 'Solo usuarios premium pueden usar el asistente IA. Hazte premium por 5 €/mes.' }, { status: 403 })
  }

  const body = await req.json()
  const { query, productContext, history } = body

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Consulta requerida' }, { status: 400 })
  }

  try {
    const result = await dermoChat(
      { query, productContext, history: history || [] },
      user.email
    )

    await sql`
      INSERT INTO dermo_consultations (user_email, query, response, model_used)
      VALUES (${user.email}, ${query}, ${result.content}, ${result.model})
    `

    // Log token consumption to telemetry
    const productName = productContext
      ? productContext.replace(/^Producto consultado:\s*/i, '').trim()
      : 'Asistente IA'
    const totalTokens = (result.inputTokens ?? 0) + (result.outputTokens ?? 0)
    await sql`
      INSERT INTO dermo_telemetry_log (product_name, user_type, user_email, tokens_consumed)
      VALUES (${productName}, 'premium', ${user.email}, ${totalTokens})
    `.catch(() => {})

    return NextResponse.json({ content: result.content })
  } catch (err: any) {
    console.error('Dermo chat error:', err)
    return NextResponse.json({ error: 'Error al procesar la consulta: ' + (err.message || 'Error interno') }, { status: 500 })
  }
}
