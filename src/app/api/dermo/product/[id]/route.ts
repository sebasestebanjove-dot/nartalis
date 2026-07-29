import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDermoSession } from '@/lib/dermo-auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { id } = await params

  const isPremium = user.is_premium || false

  const products = await sql`
    SELECT p.*, b.name as brand_name, b.logo_url as brand_logo
    FROM dermo_products p
    LEFT JOIN dermo_brands b ON p.brand_id = b.id
    WHERE p.id = ${id}
  `

  if (products.length === 0) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  const p = products[0]

  if (!isPremium) {
    return NextResponse.json({
      id: p.id,
      name: p.name,
      brand_id: p.brand_id,
      brand: p.brand_name ? { id: p.brand_id, name: p.brand_name, logo_url: p.brand_logo } : null,
      image_url: p.image_url,
      description: p.description,
      ingredients: (p.ingredients || []).slice(0, 2),
      analysis: p.analysis ? { limited: true, preview: 'Suscribete para ver el analisis completo' } : null,
      skin_types: p.skin_types,
      has_more: true,
      premium_required: true,
      message: 'Desbloquea el analisis completo por solo 5 EUR/mes.',
    })
  }

  return NextResponse.json({
    id: p.id,
    name: p.name,
    brand_id: p.brand_id,
    brand: p.brand_name ? { id: p.brand_id, name: p.brand_name, logo_url: p.brand_logo } : null,
    image_url: p.image_url,
    description: p.description,
    ingredients: p.ingredients,
    analysis: p.analysis,
    skin_types: p.skin_types,
    indications: p.indications,
    contraindications: p.contraindications,
    is_active: p.is_active,
    created_at: p.created_at,
  })
}
