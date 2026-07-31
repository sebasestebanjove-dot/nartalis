import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireEspacioUser, validateNregistro, validateNombre } from '@/lib/espacio'

function clampLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed)) return 10
  return Math.min(50, Math.max(1, parsed))
}

// ─── Últimas consultas personales del usuario ──────────────────
export async function GET(req: NextRequest) {
  const user = await requireEspacioUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const limit = clampLimit(req.nextUrl.searchParams.get('limit'))

  try {
    const consultas = await sql`
      SELECT nregistro, nombre, consulted_at::text AS consulted_at
      FROM nartalis_user_consultas
      WHERE user_id = ${user.id}
      ORDER BY consulted_at DESC
      LIMIT ${limit}
    `
    return NextResponse.json({ consultas })
  } catch (err) {
    console.error('espacio GET historial error:', err)
    return NextResponse.json({ error: 'No se pudo cargar el historial' }, { status: 500 })
  }
}

// ─── Registrar una consulta (fire-and-forget desde el cliente) ─
export async function POST(req: Request) {
  const user = await requireEspacioUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const payload = body as Record<string, unknown>

  const nr = validateNregistro(payload.nregistro)
  if (!nr.ok) {
    return NextResponse.json({ error: nr.error }, { status: 400 })
  }
  const nm = validateNombre(payload.nombre)
  if (!nm.ok) {
    return NextResponse.json({ error: nm.error }, { status: 400 })
  }

  try {
    await sql`
      INSERT INTO nartalis_user_consultas (user_id, nregistro, nombre)
      VALUES (${user.id}, ${nr.nregistro}, ${nm.nombre || nr.nregistro})
    `
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('espacio POST historial error:', err)
    return NextResponse.json({ error: 'No se pudo registrar la consulta' }, { status: 500 })
  }
}
