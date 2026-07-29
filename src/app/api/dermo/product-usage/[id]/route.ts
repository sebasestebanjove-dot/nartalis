import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!user.is_premium) return NextResponse.json({ error: 'Premium requerido' }, { status: 403 })

  try {
    const { size_ml, use_frequency, is_active } = await req.json()

    if (size_ml === undefined && use_frequency === undefined && is_active === undefined) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const setClauses: string[] = ['updated_at = NOW()']
    if (size_ml !== undefined) setClauses.push(`size_ml = ${Number(size_ml)}`)
    if (use_frequency !== undefined) setClauses.push(`use_frequency = '${use_frequency.replace(/'/g, "''")}'`)
    if (is_active !== undefined) setClauses.push(`is_active = ${is_active}`)

    const [updated] = await sql`
      UPDATE dermo_product_usage
      SET ${sql.unsafe(setClauses.join(', '))}
      WHERE id = ${id} AND user_email = ${user.email}
      RETURNING *
    `

    if (!updated) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    return NextResponse.json({ product: updated })
  } catch (err: any) {
    console.error('Product usage PATCH error:', err)
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getDermoSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    await sql`
      UPDATE dermo_product_usage SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND user_email = ${user.email}
    `
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Product usage DELETE error:', err)
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
  }
}
