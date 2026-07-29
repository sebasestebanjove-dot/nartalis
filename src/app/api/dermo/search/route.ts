import { NextResponse } from 'next/server'
import { getDermoSession } from '@/lib/dermo-auth'
import { sql } from '@/lib/db'

export async function GET(req: Request) {
  const user = await getDermoSession()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const skinType = searchParams.get('skin_type') || ''
  const brandId = searchParams.get('brand') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const isPremium = user.is_premium

  let where = sql`WHERE p.is_active = true`
  const params: any[] = []

  if (q) {
    where = sql`${where} AND (LOWER(p.name) LIKE ${'%' + q.toLowerCase() + '%'} OR LOWER(p.description) LIKE ${'%' + q.toLowerCase() + '%'})`
  }
  if (skinType) {
    where = sql`${where} AND p.skin_types @> ARRAY[${skinType}]`
  }
  if (brandId) {
    where = sql`${where} AND p.brand_id = ${brandId}`
  }

  const countResult = await sql`
    SELECT COUNT(*)::int AS total FROM dermo_products p ${where}
  `
  const total = countResult[0]?.total || 0

  const products = await sql`
    SELECT p.*, b.name as brand_name, b.logo_url as brand_logo
    FROM dermo_products p
    LEFT JOIN dermo_brands b ON p.brand_id = b.id
    ${where}
    ORDER BY p.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const results = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    brand_id: p.brand_id,
    brand: p.brand_name ? { id: p.brand_id, name: p.brand_name, logo_url: p.brand_logo } : null,
    image_url: p.image_url,
    description: p.description,
    ingredients: isPremium ? p.ingredients : (p.ingredients || []).slice(0, 2),
    skin_types: p.skin_types,
    has_more: !isPremium && (p.ingredients?.length || 0) > 2,
    premium_required: !isPremium,
  }))

  return NextResponse.json({ results, total })
}
