import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

const MOCK_PHARMACIES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Farmacia Central Diagonal',
    address: 'Av. Diagonal 432',
    postal_code: '08010',
    city: 'Barcelona',
    phone: '932 15 67 89',
    latitude: 41.3917,
    longitude: 2.1805,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Farmacia Clot',
    address: 'Carrer del Clot 92',
    postal_code: '08010',
    city: 'Barcelona',
    phone: '933 20 45 67',
    latitude: 41.4075,
    longitude: 2.1900,
  },
]

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const pc = searchParams.get('pc') || ''

  let where = sql`WHERE ps.product_id = ${id} AND ps.available = true`
  if (pc) {
    where = sql`${where} AND ph.postal_code = ${pc}`
  }

  const stocks = await sql`
    SELECT ps.*, ph.name as pharmacy_name, ph.address, ph.postal_code, ph.city, ph.phone, ph.latitude, ph.longitude
    FROM dermo_product_stock ps
    JOIN dermo_pharmacies ph ON ps.pharmacy_id = ph.id
    ${where}
    ORDER BY ph.name ASC
    LIMIT 20
  `

  const results = stocks.map((s: any) => ({
    id: s.id,
    product_id: s.product_id,
    pharmacy_id: s.pharmacy_id,
    stock: s.stock,
    available: s.available,
    reservation_enabled: s.reservation_enabled,
    price: s.price,
    pharmacy: {
      id: s.pharmacy_id,
      name: s.pharmacy_name,
      address: s.address,
      postal_code: s.postal_code,
      city: s.city,
      phone: s.phone,
      latitude: s.latitude,
      longitude: s.longitude,
    },
  }))

  // Mock seed: if no real stock found AND postal code is 08010 (or user default)
  if (results.length === 0) {
    const targetPc = pc || user.codigo_postal || ''
    if (targetPc === '08010') {
      const mock = MOCK_PHARMACIES.map((p) => ({
        id: `mock-${p.id}`,
        product_id: id,
        pharmacy_id: p.id,
        stock: 3,
        available: true,
        reservation_enabled: true,
        price: 19.95,
        pharmacy: { ...p },
      }))
      return NextResponse.json(mock)
    }
  }

  return NextResponse.json(results)
}
