import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'

// GET /api/admin/search-log — analítica de búsquedas texto/voz (FASE 6/6A).
// Filtros: from (YYYY-MM-DD), to (YYYY-MM-DD), search_type (text|voice).
// Devuelve agregados + top queries + evolución diaria. Solo ADMIN.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: adminUnauthorized(guard.reason).error }, { status: adminUnauthorized(guard.reason).status })
  }

  const sp = req.nextUrl.searchParams
  const fromRaw = sp.get('from')
  const toRaw = sp.get('to')
  const type = sp.get('search_type')

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const from = fromRaw && DATE_RE.test(fromRaw) ? fromRaw : null
  const to = toRaw && DATE_RE.test(toRaw) ? toRaw : null
  const searchType = type === 'text' || type === 'voice' ? type : null

  const filters: string[] = []
  const params: unknown[] = []
  let i = 1
  if (from) { params.push(from); filters.push(`created_at >= $${i++}::date`) }
  if (to) { params.push(to); filters.push(`created_at < ($${i++}::date + INTERVAL '1 day')`) }
  if (searchType) { params.push(searchType); filters.push(`search_type = $${i++}`) }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const whereOr = filters.length ? `${where} AND` : 'WHERE'

  try {
    const [agg] = await sql.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE search_type = 'text')::int AS text_count,
              COUNT(*) FILTER (WHERE search_type = 'voice')::int AS voice_count,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
              COUNT(*) FILTER (WHERE NOT was_successful)::int AS without_results,
              COUNT(*) FILTER (WHERE user_id IS NULL)::int AS anonymous,
              COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS authenticated
       FROM farma_search_log ${where}`,
      params,
    )

    const topQueries = await sql.query(
      `SELECT LOWER(TRIM(query)) AS query,
              COUNT(*)::int AS total_count,
              COUNT(*) FILTER (WHERE search_type = 'text')::int AS text_count,
              COUNT(*) FILTER (WHERE search_type = 'voice')::int AS voice_count
       FROM farma_search_log
       ${whereOr} query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY LOWER(TRIM(query))
       ORDER BY total_count DESC
       LIMIT 10`,
      params,
    )

    const topVoice = await sql.query(
      `SELECT LOWER(TRIM(query)) AS query, COUNT(*)::int AS total_count
       FROM farma_search_log
       ${whereOr} search_type = 'voice'
       AND query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY LOWER(TRIM(query))
       ORDER BY total_count DESC
       LIMIT 10`,
      params,
    )

    const topZero = await sql.query(
      `SELECT LOWER(TRIM(query)) AS query, COUNT(*)::int AS total_count
       FROM farma_search_log
       ${whereOr} NOT was_successful
       AND query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY LOWER(TRIM(query))
       ORDER BY total_count DESC
       LIMIT 10`,
      params,
    )

    const daily = await sql.query(
      `SELECT DATE(created_at)::text AS day,
              COUNT(*)::int AS total_count,
              COUNT(*) FILTER (WHERE search_type = 'voice')::int AS voice_count
       FROM farma_search_log ${where}
       GROUP BY DATE(created_at)
       ORDER BY day DESC`,
      params,
    )

    // Origen de las búsquedas (campo source): única agregación, mismos filtros.
    // Clasificación exclusiva por source — sin heurísticas. NULL/vacío = histórico sin atribuir.
    const bySource = await sql.query(
      `SELECT CASE
                WHEN source IS NULL OR source = '' THEN 'no_atribuido'
                WHEN source = 'home' THEN 'home'
                WHEN source = 'medicine_page' THEN 'medicine_page'
                ELSE 'otros'
              END AS origin,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
              COUNT(*) FILTER (WHERE NOT was_successful)::int AS without_results
       FROM farma_search_log ${where}
       GROUP BY origin`,
      params,
    )

    const byUser = await sql.query(
      `SELECT s.user_id,
              u.email,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE s.search_type = 'text')::int AS text,
              COUNT(*) FILTER (WHERE s.search_type = 'voice')::int AS voice,
              COUNT(*) FILTER (WHERE s.was_successful)::int AS success
       FROM farma_search_log s
       LEFT JOIN nartalis_users u ON u.id = s.user_id
       ${filters.length ? `WHERE ${filters.map((f) => f.replace(/created_at/g, 's.created_at').replace(/search_type/g, 's.search_type')).join(' AND ')}` : ''}
       GROUP BY s.user_id, u.email
       ORDER BY total DESC
       LIMIT 10`,
      params,
    )

    return NextResponse.json({
      ok: true,
      data: {
        range: { from: from || 'inicio', to: to || 'hoy' },
        totals: agg,
        topQueries,
        topVoice,
        topZero,
        daily,
        bySource,
        byUser,
      },
    })
  } catch (err) {
    console.error('admin search-log error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
