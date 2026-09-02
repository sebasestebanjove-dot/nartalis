import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'
import {
  excludeInternalClause,
} from '@/lib/analytics-exclusion'

// GET /api/admin/analytics?section=overview|search|botiquin|conversion|retention&exclude=1|0
// Métricas agregadas de producto calculadas desde Neon. Solo ADMIN.
// Las métricas GA4 NO se exponen aquí (no accesibles desde código): se muestran
// como bloques informativos/enlace en la UI (ver AdminAnalyticsView).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type Ctx = { exclude: boolean; from: string | null; to: string | null }

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json(
      { error: adminUnauthorized(guard.reason).error },
      { status: adminUnauthorized(guard.reason).status },
    )
  }

  const sp = req.nextUrl.searchParams
  const section = sp.get('section') || 'overview'
  const excludeRaw = sp.get('exclude')
  const exclude = excludeRaw === '0' ? false : true
  const fromRaw = sp.get('from')
  const toRaw = sp.get('to')
  const from = fromRaw && DATE_RE.test(fromRaw) ? fromRaw : null
  const to = toRaw && DATE_RE.test(toRaw) ? toRaw : null
  const ctx: Ctx = { exclude, from, to }

  if (section === 'search') return handleSearch(ctx)
  if (section === 'botiquin') return handleBotiquin(ctx)
  if (section === 'conversion') return handleConversion(ctx)
  if (section === 'retention') return handleRetention(ctx)
  return handleOverview(ctx)
}

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data })
}

function fail(err: unknown) {
  console.error('admin analytics error:', err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

// ───────────────────────────── SEARCH ─────────────────────────────
async function handleSearch(ctx: Ctx) {
  try {
    const totalWhere = buildTotalWhere(ctx)
    const [totals] = await sql.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
         COUNT(*) FILTER (WHERE NOT was_successful)::int AS without_results,
         COUNT(*) FILTER (WHERE user_id IS NULL)::int AS anonymous,
         COUNT(*) FILTER (WHERE user_id IS NOT NULL AND ${excludeInternalClause('user_id')})::int AS identified,
         COUNT(*) FILTER (WHERE user_id IS NOT NULL AND NOT (${excludeInternalClause('user_id')}))::int AS internal
       FROM farma_search_log ${totalWhere.where}`,
      totalWhere.params,
    )

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
       FROM farma_search_log ${totalWhere.where}
       GROUP BY origin
       ORDER BY total DESC`,
      totalWhere.params,
    )

    const daily = await sql.query(
      `SELECT DATE(created_at)::text AS day,
              COUNT(*)::int AS total
       FROM farma_search_log ${totalWhere.where}
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      totalWhere.params,
    )

    const topZero = await sql.query(
      `SELECT LOWER(TRIM(query)) AS query, COUNT(*)::int AS n
       FROM farma_search_log ${totalWhere.where}
         AND NOT was_successful
         AND query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY LOWER(TRIM(query))
       ORDER BY n DESC
       LIMIT 10`,
      totalWhere.params,
    )

    return ok({ range: { from: ctx.from || 'inicio', to: ctx.to || 'hoy' }, exclude: ctx.exclude, totals, bySource, daily, topZero })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── BOTIQUÍN ─────────────────────────────
async function handleBotiquin(ctx: Ctx) {
  try {
    const excl = ctx.exclude ? `AND ${excludeInternalClause('m.user_id')} AND m.user_id IN (SELECT id FROM nartalis_users)` : ''
    const [totals] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_user_medicamentos m WHERE 1=1 ${excl}) AS saved,
         (SELECT COUNT(*)::int FROM nartalis_user_medicamentos m WHERE m.is_favorite ${excl}) AS favorites,
         (SELECT COUNT(DISTINCT m.user_id)::int FROM nartalis_user_medicamentos m WHERE 1=1 ${excl}) AS users_with_meds,
         (SELECT COUNT(*)::int FROM nartalis_user_consultas c WHERE 1=1 ${ctx.exclude ? `AND ${excludeInternalClause('c.user_id')}` : ''}) AS consultas
       `,
    )

    const evolution = await sql.query(
      `SELECT DATE(m.created_at)::text AS day, COUNT(*)::int AS n
       FROM nartalis_user_medicamentos m
       WHERE 1=1 ${ctx.exclude ? `AND ${excludeInternalClause('m.user_id')}` : ''}
       GROUP BY DATE(m.created_at)
       ORDER BY day ASC`,
    )

    const topSaved = await sql.query(
      `SELECT m.nombre, m.nregistro, COUNT(*)::int AS saves,
              COUNT(*) FILTER (WHERE m.is_favorite)::int AS favorites
       FROM nartalis_user_medicamentos m
       WHERE 1=1 ${ctx.exclude ? `AND ${excludeInternalClause('m.user_id')}` : ''}
       GROUP BY m.nombre, m.nregistro
       ORDER BY saves DESC
       LIMIT 10`,
    )

    return ok({ exclude: ctx.exclude, totals, evolution, topSaved })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── CONVERSION ─────────────────────────────
async function handleConversion(ctx: Ctx) {
  try {
    const excl = ctx.exclude ? `AND ${excludeInternalClause('u.id')}` : ''
    const dateF = ctx.from ? `AND u.created_at >= '${ctx.from}'::date` : ''
    const dateT = ctx.to ? `AND u.created_at < ('${ctx.to}'::date + INTERVAL '1 day')` : ''

    const [reg] = await sql.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days')::int AS new_7d,
         COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int AS new_30d
       FROM nartalis_users u
       WHERE 1=1 ${excl} ${dateF} ${dateT}`,
    )

    const [act] = await sql.query(
      `SELECT
         COUNT(DISTINCT u.id)::int AS activated,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days')::int AS activated_7d,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int AS activated_30d
       FROM nartalis_users u
       JOIN nartalis_user_medicamentos m ON m.user_id = u.id
       WHERE 1=1 ${excl} ${dateF} ${dateT}`,
    )

    return ok({ exclude: ctx.exclude, registration: reg, activation: act })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── RETENTION ─────────────────────────────
async function handleRetention(ctx: Ctx) {
  try {
    const excl = ctx.exclude ? `AND ${excludeInternalClause('u.id')}` : ''
    // Actividad de retorno: búsqueda (preferencia 1), consulta (2), botiquín (3).
    const rows = await sql.query(
      `SELECT u.id,
              u.created_at,
              COALESCE(
                (SELECT MIN(s.created_at) FROM farma_search_log s WHERE s.user_id = u.id AND s.created_at > u.created_at),
                (SELECT MIN(c.consulted_at) FROM nartalis_user_consultas c WHERE c.user_id = u.id AND c.consulted_at > u.created_at),
                (SELECT MIN(m.created_at) FROM nartalis_user_medicamentos m WHERE m.user_id = u.id AND m.created_at > u.created_at)
              ) AS return_at
       FROM nartalis_users u
       WHERE 1=1 ${excl}`,
    )

    const cohort = rows.length
    let d1 = 0
    let d7 = 0
    let d30 = 0
    const base = ctx.from ? new Date(ctx.from + 'T00:00:00Z').getTime() : null
    for (const r of rows) {
      if (!r.return_at) continue
      if (base !== null) {
        const created = new Date(r.created_at + (r.created_at.includes('T') ? 'Z' : 'T00:00:00Z')).getTime()
        if (created < base) continue
      }
      const ret = new Date(r.return_at + (r.return_at.includes('T') ? 'Z' : 'T00:00:00Z')).getTime()
      const created = new Date(r.created_at + (r.created_at.includes('T') ? 'Z' : 'T00:00:00Z')).getTime()
      if (ret <= created + 1 * 24 * 60 * 60 * 1000) d1++
      if (ret <= created + 7 * 24 * 60 * 60 * 1000) d7++
      if (ret <= created + 30 * 24 * 60 * 60 * 1000) d30++
    }

    return ok({ exclude: ctx.exclude, cohort, d1, d7, d30 })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── OVERVIEW ─────────────────────────────
async function handleOverview(ctx: Ctx) {
  try {
    const exclUser = ctx.exclude ? `AND ${excludeInternalClause('u.id')}` : ''
    const [users] = await sql.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int AS new_30d
       FROM nartalis_users u
       WHERE 1=1 ${exclUser}`,
    )

    const [search] = await sql.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
              COUNT(*) FILTER (WHERE user_id IS NULL)::int AS anonymous
       FROM farma_search_log WHERE 1=1
       ${ctx.exclude ? `AND (user_id IS NULL OR ${excludeInternalClause('user_id')})` : ''}
       ${ctx.from ? `AND created_at >= '${ctx.from}'::date` : ''}
       ${ctx.to ? `AND created_at < ('${ctx.to}'::date + INTERVAL '1 day')` : ''}`,
    )

    const [product] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_user_medicamentos m WHERE 1=1 ${ctx.exclude ? `AND ${excludeInternalClause('m.user_id')}` : ''}) AS saved,
         (SELECT COUNT(DISTINCT m.user_id)::int FROM nartalis_user_medicamentos m WHERE 1=1 ${ctx.exclude ? `AND ${excludeInternalClause('m.user_id')}` : ''}) AS users_meds,
         (SELECT COUNT(DISTINCT u.id)::int FROM nartalis_users u JOIN nartalis_user_medicamentos m ON m.user_id=u.id WHERE 1=1 ${exclUser}) AS activated
       `,
    )

    return ok({ exclude: ctx.exclude, users, search, product })
  } catch (e) {
    return fail(e)
  }
}

// WHEREs de fecha reutilizables para búsquedas.
function buildTotalWhere(ctx: Ctx): { where: string; params: unknown[] } {
  const parts: string[] = []
  const params: unknown[] = []
  let i = 1
  if (ctx.from) {
    params.push(ctx.from)
    parts.push(`created_at >= $${i++}::date`)
  }
  if (ctx.to) {
    params.push(ctx.to)
    parts.push(`created_at < ($${i++}::date + INTERVAL '1 day')`)
  }
  if (ctx.exclude) {
    // Excluye lo imputable a internos; conserva anónimos.
    parts.push(`(user_id IS NULL OR ${excludeInternalClause('user_id')})`)
  }
  return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params }
}
