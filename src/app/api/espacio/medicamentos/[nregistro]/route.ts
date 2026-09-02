import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireEspacioUser, validateNregistro } from '@/lib/espacio'

interface RouteCtx {
  params: Promise<{ nregistro: string }>
}

// ─── Consultar si un medicamento está guardado y favorito (para el usuario actual) ──
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const user = await requireEspacioUser()
  if (!user) {
    return NextResponse.json({ saved: false, is_favorite: false })
  }

  const { nregistro: rawNregistro } = await params
  const nr = validateNregistro(rawNregistro)
  if (!nr.ok) {
    return NextResponse.json({ saved: false, is_favorite: false })
  }

  try {
    const rows = await sql`
      SELECT is_favorite FROM nartalis_user_medicamentos
      WHERE user_id = ${user.id} AND nregistro = ${nr.nregistro}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ saved: false, is_favorite: false })
    }
    return NextResponse.json({ saved: true, is_favorite: rows[0].is_favorite ?? false })
  } catch {
    return NextResponse.json({ saved: false, is_favorite: false })
  }
}

// ─── Marcar / desmarcar favorito sobre un medicamento guardado ──
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const user = await requireEspacioUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { nregistro: rawNregistro } = await params
  const nr = validateNregistro(rawNregistro)
  if (!nr.ok) {
    return NextResponse.json({ error: nr.error }, { status: 400 })
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
  const bodyObj = body as { is_favorite?: unknown }

  if (typeof bodyObj.is_favorite !== 'boolean') {
    return NextResponse.json({ error: 'is_favorite debe ser un booleano' }, { status: 400 })
  }
  const isFavorite = bodyObj.is_favorite

  try {
    const result = await sql`
      UPDATE nartalis_user_medicamentos
      SET is_favorite = ${isFavorite}, updated_at = NOW()
      WHERE user_id = ${user.id} AND nregistro = ${nr.nregistro}
      RETURNING id
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Medicamento no guardado' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, is_favorite: isFavorite })
  } catch (err) {
    console.error('espacio PATCH medicamento error:', err)
    return NextResponse.json({ error: 'No se pudo actualizar el medicamento' }, { status: 500 })
  }
}

// ─── Quitar un medicamento guardado (idempotente) ──────────────
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const user = await requireEspacioUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { nregistro: rawNregistro } = await params
  const nr = validateNregistro(rawNregistro)
  if (!nr.ok) {
    return NextResponse.json({ error: nr.error }, { status: 400 })
  }

  try {
    await sql`
      DELETE FROM nartalis_user_medicamentos
      WHERE user_id = ${user.id} AND nregistro = ${nr.nregistro}
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('espacio DELETE medicamento error:', err)
    return NextResponse.json({ error: 'No se pudo eliminar el medicamento' }, { status: 500 })
  }
}
