import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function POST(req: Request) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!user.is_premium) {
    return NextResponse.json({ error: 'Solo usuarios premium pueden reservar. Hazte premium por 5 €/mes.' }, { status: 403 })
  }

  const body = await req.json()
  const { product_id, pharmacy_id } = body

  if (!product_id || !pharmacy_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const product = await sql`SELECT id, name FROM dermo_products WHERE id = ${product_id}`
  if (product.length === 0) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  const stock = await sql`
    SELECT id FROM dermo_product_stock
    WHERE product_id = ${product_id} AND pharmacy_id = ${pharmacy_id} AND available = true
  `
  if (stock.length === 0) {
    return NextResponse.json({ error: 'Producto no disponible en esta farmacia' }, { status: 400 })
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const pickupCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * 36)]).join('')

  const [booking] = await sql`
    INSERT INTO dermo_bookings (user_email, product_id, pharmacy_id, status, pickup_code)
    VALUES (${user.email}, ${product_id}, ${pharmacy_id}, 'pending', ${pickupCode})
    RETURNING id, pickup_code
  `

  return NextResponse.json({
    ok: true,
    booking_id: booking.id,
    pickup_code: booking.pickup_code,
    message: `Reserva solicitada. Tu código de recogida es: ${pickupCode}`,
  })
}
