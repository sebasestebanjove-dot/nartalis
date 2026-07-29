import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession, createDermoSession } from '@/lib/dermo-auth'

export async function POST(req: NextRequest) {
  try {
    const { codigo_postal } = await req.json()
    const session = await getDermoSession()

    if (!session || !session.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const cleanCp = (codigo_postal || '').trim().slice(0, 10)

    const [updated] = await sql`
      UPDATE dermo_users
      SET codigo_postal = ${cleanCp}
      WHERE email = ${session.email}
      RETURNING id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
    `

    // Also update ia_module_users
    await sql`
      UPDATE ia_module_users
      SET codigo_postal = ${cleanCp}, needs_codigo_postal = false
      WHERE email = ${session.email}
    `

    await createDermoSession({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      auth_provider: updated.auth_provider,
      codigo_postal: updated.codigo_postal,
      is_premium: !!updated.is_premium,
      consultas_consumidas: updated.consultas_consumidas ?? 0,
      created_at: updated.created_at,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('dermo google complete error:', err)
    return NextResponse.json({ error: 'Error al guardar código postal' }, { status: 500 })
  }
}
