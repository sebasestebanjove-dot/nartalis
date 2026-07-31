import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireEspacioUser, validateNregistro, validateNombre } from '@/lib/espacio'

// Resuelve el nombre canónico desde la caché local cuando es posible.
// Nunca confía ciegamente en el nombre enviado por el cliente.
async function resolveNombre(nregistro: string, clienteNombre: string): Promise<string> {
  try {
    const rows = await sql`SELECT nombre FROM farma_name_cache WHERE nregistro = ${nregistro}`
    if (rows.length > 0 && rows[0].nombre) {
      return String(rows[0].nombre).trim()
    }
  } catch {
    // si la caché falla, se usa el nombre del cliente o cadena vacía
  }
  return clienteNombre || ''
}

// ─── Listar medicamentos guardados del usuario ────────────────
export async function GET() {
  const user = await requireEspacioUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const medicamentos = await sql`
      SELECT nregistro, nombre, is_favorite, created_at::text AS created_at
      FROM nartalis_user_medicamentos
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    const total = medicamentos.length
    const favorites = medicamentos.filter((m: { is_favorite?: boolean }) => !!m.is_favorite).length

    return NextResponse.json({
      medicamentos,
      total,
      favorites,
    })
  } catch (err) {
    console.error('espacio GET medicamentos error:', err)
    return NextResponse.json({ error: 'No se pudieron cargar los medicamentos' }, { status: 500 })
  }
}

// ─── Guardar un medicamento (idempotente, anti-duplicados) ────
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
    const exists = await sql`
      SELECT 1 FROM farma_name_cache WHERE nregistro = ${nr.nregistro} LIMIT 1
    `
    if (exists.length === 0) {
      return NextResponse.json({ error: 'Medicamento no encontrado' }, { status: 404 })
    }

    const nombre = await resolveNombre(nr.nregistro, nm.nombre)

    const result = await sql`
      INSERT INTO nartalis_user_medicamentos (user_id, nregistro, nombre)
      VALUES (${user.id}, ${nr.nregistro}, ${nombre})
      ON CONFLICT (user_id, nregistro) DO NOTHING
      RETURNING id
    `

    const alreadySaved = result.length === 0
    return NextResponse.json(
      { saved: true, ...(alreadySaved ? { alreadySaved: true } : {}) },
      { status: alreadySaved ? 200 : 201 },
    )
  } catch (err) {
    console.error('espacio POST medicamentos error:', err)
    return NextResponse.json({ error: 'No se pudo guardar el medicamento' }, { status: 500 })
  }
}
