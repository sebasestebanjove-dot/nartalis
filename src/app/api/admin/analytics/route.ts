import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'
import { excludeInternalClause } from '@/lib/analytics-exclusion'
import { getGa4Availability } from '@/lib/ga4'

// GET /api/admin/analytics?section=overview|search|med-engagement|botiquin|conversion|retention|fuentes&exclude=1|0
// Métricas agregadas de producto calculadas desde Neon. Solo ADMIN.
// Las métricas GA4 NO se exponen aquí (no accesibles desde código): la UI las
// muestra informativas con enlace (ver AdminAnalyticsView). `ga4` solo indica
// disponibilidad de una futura conexión (nunca cifras).

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
  const exclude = sp.get('exclude') !== '0'
  const fromRaw = sp.get('from')
  const toRaw = sp.get('to')
  const from = fromRaw && DATE_RE.test(fromRaw) ? fromRaw : null
  const to = toRaw && DATE_RE.test(toRaw) ? toRaw : null
  const ctx: Ctx = { exclude, from, to }

  switch (section) {
    case 'search':
      return handleSearch(ctx)
    case 'med-engagement':
      return handleMedEngagement(ctx)
    case 'botiquin':
      return handleBotiquin(ctx)
    case 'conversion':
      return handleConversion(ctx)
    case 'retention':
      return handleRetention(ctx)
    case 'fuentes':
      return handleFuentes(ctx)
    case 'visits':
      return handleVisits(ctx)
    case 'funnel':
      return handleFunnel(ctx)
    case 'cta':
      return handleCta(ctx)
    default:
      return handleOverview(ctx)
  }
}

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data })
}

function fail(err: unknown) {
  console.error('admin analytics error:', err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

// ───────────────────────── helpers de SQL ─────────────────────────
function dateAnd(ctx: Ctx, col: string): string {
  let s = ''
  if (ctx.from) s += ` AND ${col} >= '${ctx.from}'::date`
  if (ctx.to) s += ` AND ${col} < ('${ctx.to}'::date + INTERVAL '1 day')`
  return s
}

// Cláusula para tablas referenciadas por user_id (consultas, botiquín, usuarios).
function tableWhere(ctx: Ctx, dateCol: string, idCol: string): string {
  let s = 'WHERE 1=1'
  s += dateAnd(ctx, dateCol)
  if (ctx.exclude) s += ` AND ${excludeInternalClause(idCol)}`
  return s
}

// Alcance de farma_search_log. keeps_anon=true conserva búsquedas anónimas
// (no imputables a internos); identified solo búsquedas con sesión no interna.
function searchScope(ctx: Ctx, mode: 'keeps_anon' | 'identified'): string {
  let s = 'WHERE 1=1'
  s += dateAnd(ctx, 'created_at')
  if (mode === 'keeps_anon') {
    if (ctx.exclude) s += ` AND (user_id IS NULL OR ${excludeInternalClause('user_id')})`
  } else {
    s += ' AND user_id IS NOT NULL'
    if (ctx.exclude) s += ` AND ${excludeInternalClause('user_id')}`
  }
  return s
}

// ───────────────────────────── SEARCH ─────────────────────────────
async function handleSearch(ctx: Ctx) {
  try {
    const excl = excludeInternalClause('user_id')
    const scope = searchScope(ctx, 'keeps_anon')
    const scen = searchScope(ctx, 'identified')

    const [totals] = await sql.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
         COUNT(*) FILTER (WHERE NOT was_successful)::int AS without_results,
         COUNT(*) FILTER (WHERE user_id IS NULL)::int AS anonymous,
         COUNT(*) FILTER (WHERE user_id IS NOT NULL AND ${excl})::int AS identified,
         COUNT(*) FILTER (WHERE user_id IS NOT NULL AND NOT (${excl}))::int AS internal
       FROM farma_search_log ${scope}`,
    )

    // Usuarios distintos que buscaron con sesión (búsquedas ≠ personas).
    const [users] = await sql.query(
      `SELECT COUNT(DISTINCT user_id)::int AS users
       FROM farma_search_log ${scen}`,
    )

    // Cadencia rápida (últimos 7/30/90 respecto a ahora; independiente del rango).
    const [period] = await sql.query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30d,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days')::int AS last_90d
       FROM farma_search_log WHERE 1=1
       ${ctx.exclude ? `AND (user_id IS NULL OR ${excl})` : ''}`,
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
       FROM farma_search_log ${scope}
       GROUP BY origin
       ORDER BY total DESC`,
    )

    const bySourcePage = await sql.query(
      `SELECT CASE
                WHEN source_page IS NULL OR source_page = '' THEN 'no_atribuido'
                WHEN source_page = '/' THEN 'home'
                WHEN source_page LIKE '/prospectos/%' THEN 'medicine_page'
                ELSE 'otros'
              END AS origin,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
              COUNT(*) FILTER (WHERE NOT was_successful)::int AS without_results
       FROM farma_search_log ${scope}
       GROUP BY origin
       ORDER BY total DESC`,
    )

    const daily = await sql.query(
      `SELECT DATE(created_at)::text AS day, COUNT(*)::int AS total
       FROM farma_search_log ${scope}
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
    )

    const topQueries = await sql.query(
      `SELECT LOWER(TRIM(query)) AS query,
              COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results
       FROM farma_search_log ${scope}
         AND query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY LOWER(TRIM(query))
       ORDER BY n DESC
       LIMIT 10`,
    )

    const topZero = await sql.query(
      `SELECT LOWER(TRIM(query)) AS query, COUNT(*)::int AS n
       FROM farma_search_log ${scope}
         AND NOT was_successful
         AND query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY LOWER(TRIM(query))
       ORDER BY n DESC
       LIMIT 10`,
    )

    return ok({
      range: { from: ctx.from || 'inicio', to: ctx.to || 'hoy' },
      exclude: ctx.exclude,
      totals,
      identified_users: users?.users ?? 0,
      period,
      bySource,
      bySourcePage,
      daily,
      topQueries,
      topZero,
    })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────── MEDICINE ENGAGEMENT ─────────────────────────
// Versión IDENTIFICADA (Neon). El comportamiento anónimo (medicine_view,
// medicine_second_view) vive en GA4 y no se duplica aquí.
async function handleMedEngagement(ctx: Ctx) {
  try {
    const where = tableWhere(ctx, 'c.consulted_at', 'c.user_id')

    const [totals] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_user_consultas c ${where}) AS consulted,
         (SELECT COUNT(DISTINCT c.user_id)::int FROM nartalis_user_consultas c ${where}) AS users,
         (SELECT COUNT(*)::int FROM (
            SELECT 1 FROM nartalis_user_consultas c ${where}
            GROUP BY c.user_id HAVING COUNT(*) >= 2
          ) x) AS users_depth2,
         (SELECT COUNT(*)::int FROM (
            SELECT 1 FROM nartalis_user_consultas c ${where}
            GROUP BY c.user_id, c.nregistro HAVING COUNT(*) >= 2
          ) y) AS repeated_med`,
    )

    const [period] = await sql.query(
      `SELECT
         COUNT(*) FILTER (WHERE c.consulted_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
         COUNT(*) FILTER (WHERE c.consulted_at >= NOW() - INTERVAL '30 days')::int AS last_30d,
         COUNT(*) FILTER (WHERE c.consulted_at >= NOW() - INTERVAL '90 days')::int AS last_90d
       FROM nartalis_user_consultas c WHERE 1=1
       ${ctx.exclude ? `AND ${excludeInternalClause('c.user_id')}` : ''}`,
    )

    const evolution = await sql.query(
      `SELECT DATE(c.consulted_at)::text AS day, COUNT(*)::int AS n
       FROM nartalis_user_consultas c ${where}
       GROUP BY DATE(c.consulted_at)
       ORDER BY day ASC`,
    )

    // Parte anónima del engagement (nartalis_events): medicina views y segunda
    // interacción. No se une con las consultas identificadas (funnels separados).
    const eventsScope = eventScope(ctx)
    const [anon] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_events e ${eventsScope} AND e.event_name = 'medicine_view') AS medicine_views,
         (SELECT COUNT(*)::int FROM nartalis_events e ${eventsScope} AND e.event_name = 'medicine_second_view') AS second_views`,
    )
    const [anonPeriod] = await sql.query(
      `SELECT
         COUNT(*) FILTER (WHERE e.event_name = 'medicine_view' AND e.created_at >= NOW() - INTERVAL '7 days')::int AS mv_7d,
         COUNT(*) FILTER (WHERE e.event_name = 'medicine_view' AND e.created_at >= NOW() - INTERVAL '30 days')::int AS mv_30d,
         COUNT(*) FILTER (WHERE e.event_name = 'medicine_view' AND e.created_at >= NOW() - INTERVAL '90 days')::int AS mv_90d
       FROM nartalis_events e WHERE e.event_name = 'medicine_view'
       ${ctx.exclude ? `AND (e.user_id IS NULL OR ${excludeInternalClause('e.user_id')})` : ''}`,
    )

    const topConsulted = await sql.query(
      `SELECT c.nombre, c.nregistro, COUNT(*)::int AS n
       FROM nartalis_user_consultas c ${where}
       GROUP BY c.nombre, c.nregistro
       ORDER BY n DESC
       LIMIT 10`,
    )

    return ok({
      exclude: ctx.exclude,
      range: { from: ctx.from || 'inicio', to: ctx.to || 'hoy' },
      totals,
      period,
      evolution,
      topConsulted,
      anon,
      anonPeriod,
    })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── BOTIQUÍN ─────────────────────────────
async function handleBotiquin(ctx: Ctx) {
  try {
    const whereM = tableWhere(ctx, 'm.created_at', 'm.user_id')
    const whereC = tableWhere(ctx, 'c.consulted_at', 'c.user_id')

    const [totals] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_user_medicamentos m ${whereM}) AS saved,
         (SELECT COUNT(*)::int FROM nartalis_user_medicamentos m ${whereM} AND m.is_favorite) AS favorites,
         (SELECT COUNT(DISTINCT m.user_id)::int FROM nartalis_user_medicamentos m ${whereM}) AS users_with_meds,
         (SELECT COUNT(*)::int FROM nartalis_user_consultas c ${whereC}) AS consultas`,
    )

    const evolution = await sql.query(
      `SELECT DATE(m.created_at)::text AS day, COUNT(*)::int AS n
       FROM nartalis_user_medicamentos m ${whereM}
       GROUP BY DATE(m.created_at)
       ORDER BY day ASC`,
    )

    const topSaved = await sql.query(
      `SELECT m.nombre, m.nregistro, COUNT(*)::int AS saves,
              COUNT(*) FILTER (WHERE m.is_favorite)::int AS favorites
       FROM nartalis_user_medicamentos m ${whereM}
       GROUP BY m.nombre, m.nregistro
       ORDER BY saves DESC
       LIMIT 10`,
    )

    return ok({
      exclude: ctx.exclude,
      range: { from: ctx.from || 'inicio', to: ctx.to || 'hoy' },
      totals,
      evolution,
      topSaved,
    })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── CONVERSION ─────────────────────────────
async function handleConversion(ctx: Ctx) {
  try {
    const whereU = tableWhere(ctx, 'u.created_at', 'u.id')

    const [reg] = await sql.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days')::int AS new_7d,
         COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int AS new_30d
       FROM nartalis_users u ${whereU}`,
    )

    // Funnel identificado (cohorte del periodo): registrados → con ≥1 consulta
    // → con ≥1 medicamento guardado. No se fabrican tasas si el denominador es 0.
    const [funnel] = await sql.query(
      `SELECT COUNT(DISTINCT u.id)::int AS registered,
              COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN u.id END)::int AS with_consulta,
              COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN u.id END)::int AS with_med
       FROM nartalis_users u
       LEFT JOIN nartalis_user_consultas c ON c.user_id = u.id
       LEFT JOIN nartalis_user_medicamentos m ON m.user_id = u.id
       ${whereU}`,
    )

    const [act] = await sql.query(
      `SELECT
         COUNT(DISTINCT u.id)::int AS activated,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days')::int AS activated_7d,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int AS activated_30d
       FROM nartalis_users u
       JOIN nartalis_user_medicamentos m ON m.user_id = u.id
       ${whereU}`,
    )

    return ok({ exclude: ctx.exclude, registration: reg, funnel, activation: act })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── RETENTION ─────────────────────────────
async function handleRetention(ctx: Ctx) {
  try {
    return ok(await computeRetention(ctx))
  } catch (e) {
    return fail(e)
  }
}

// Comparte la misma lógica de cohorte con Overview.
async function computeRetention(ctx: Ctx): Promise<{ exclude: boolean; cohort: number; d1: number; d7: number; d30: number }> {
  const whereU = tableWhere(ctx, 'u.created_at', 'u.id')
  // Actividad de retorno: búsqueda (preferencia 1), consulta (2), botiquín (3).
  const rows = await sql.query(
    `SELECT u.id,
            u.created_at,
            COALESCE(
              (SELECT MIN(s.created_at) FROM farma_search_log s WHERE s.user_id = u.id AND s.created_at > u.created_at),
              (SELECT MIN(c.consulted_at) FROM nartalis_user_consultas c WHERE c.user_id = u.id AND c.consulted_at > u.created_at),
              (SELECT MIN(m.created_at) FROM nartalis_user_medicamentos m WHERE m.user_id = u.id AND m.created_at > u.created_at)
            ) AS return_at
     FROM nartalis_users u ${whereU}`,
  )

  const cohort = rows.length
  let d1 = 0
  let d7 = 0
  let d30 = 0
  const parse = (v: unknown): number => {
    if (v instanceof Date) return v.getTime()
    if (typeof v === 'string') return new Date(v + (v.includes('T') ? 'Z' : 'T00:00:00Z')).getTime()
    return NaN
  }
  for (const r of rows) {
    if (!r.return_at) continue
    const ret = parse(r.return_at)
    const created = parse(r.created_at)
    if (ret <= created + 1 * 24 * 60 * 60 * 1000) d1++
    if (ret <= created + 7 * 24 * 60 * 60 * 1000) d7++
    if (ret <= created + 30 * 24 * 60 * 60 * 1000) d30++
  }

  return { exclude: ctx.exclude, cohort, d1, d7, d30 }
}

// ───────────────────────────── FUENTES ─────────────────────────────
// Dimensión Neon de punto de entrada (source / source_page de la búsqueda):
// NO equivale al source/medium de GA4. La dimensión «contextual» existe en GA4
// (tráfico ?source=contextual) y no se fabrica aquí.
async function handleFuentes(ctx: Ctx) {
  try {
    const scope = searchScope(ctx, 'keeps_anon')

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
       FROM farma_search_log ${scope}
       GROUP BY origin
       ORDER BY total DESC`,
    )

    const bySourcePage = await sql.query(
      `SELECT CASE
                WHEN source_page IS NULL OR source_page = '' THEN 'no_atribuido'
                WHEN source_page = '/' THEN 'home'
                WHEN source_page LIKE '/prospectos/%' THEN 'medicine_page'
                ELSE 'otros'
              END AS origin,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
              COUNT(*) FILTER (WHERE NOT was_successful)::int AS without_results
       FROM farma_search_log ${scope}
       GROUP BY origin
       ORDER BY total DESC`,
    )

    const topQueries = await sql.query(
      `SELECT LOWER(TRIM(query)) AS query,
              COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results
       FROM farma_search_log ${scope}
         AND query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY LOWER(TRIM(query))
       ORDER BY n DESC
       LIMIT 10`,
    )

    return ok({ exclude: ctx.exclude, bySource, bySourcePage, topQueries })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── VISITS ─────────────────────────────
// Funnel anónimo propio (nartalis_events). mide visitas/visitantes/sesiones,
// páginas vistas, fuentes de adquisición (organic/direct/contextual/internal)
// y páginas de entrada. Sin PII (sin IP/UA/referrer completo).
function eventScope(ctx: Ctx): string {
  let s = 'WHERE 1=1'
  s += dateAnd(ctx, 'created_at')
  if (ctx.exclude) s += ` AND (user_id IS NULL OR ${excludeInternalClause('user_id')})`
  return s
}

async function handleVisits(ctx: Ctx) {
  try {
    const scope = eventScope(ctx)

    const [aggr] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'page_view') AS pageviews,
         (SELECT COUNT(DISTINCT e.visitor_id)::int FROM nartalis_events e ${scope} AND e.event_name = 'page_view' AND e.visitor_id IS NOT NULL) AS visitors,
         (SELECT COUNT(*)::int FROM (
            SELECT e.visitor_id, e.created_at,
                   LAG(e.created_at) OVER (PARTITION BY e.visitor_id ORDER BY e.created_at) AS prev
            FROM nartalis_events e ${scope} AND e.event_name = 'page_view' AND e.visitor_id IS NOT NULL
          ) w WHERE w.prev IS NULL OR w.created_at - w.prev > INTERVAL '30 minutes') AS visits`,
    )

    const [periodView] = await sql.query(
      `SELECT
         COUNT(*) FILTER (WHERE e.created_at >= NOW() - INTERVAL '7 days')::int AS v7,
         COUNT(*) FILTER (WHERE e.created_at >= NOW() - INTERVAL '30 days')::int AS v30,
         COUNT(*) FILTER (WHERE e.created_at >= NOW() - INTERVAL '90 days')::int AS v90
       FROM nartalis_events e WHERE e.event_name = 'page_view'
       ${ctx.exclude ? `AND (e.user_id IS NULL OR ${excludeInternalClause('e.user_id')})` : ''}`,
    )

    const [periodVisit] = await sql.query(
      `SELECT
         COUNT(*) FILTER (WHERE x.created_at >= NOW() - INTERVAL '7 days')::int AS v7,
         COUNT(*) FILTER (WHERE x.created_at >= NOW() - INTERVAL '30 days')::int AS v30,
         COUNT(*) FILTER (WHERE x.created_at >= NOW() - INTERVAL '90 days')::int AS v90
       FROM (
         SELECT visitor_id, created_at,
                LAG(created_at) OVER (PARTITION BY visitor_id ORDER BY created_at) AS prev
         FROM nartalis_events e WHERE e.event_name = 'page_view' AND e.visitor_id IS NOT NULL
         ${ctx.exclude ? `AND (e.user_id IS NULL OR ${excludeInternalClause('e.user_id')})` : ''}
       ) x WHERE x.prev IS NULL OR x.created_at - x.prev > INTERVAL '30 minutes'`,
    )

    const bySource = await sql.query(
      `SELECT e.source, COUNT(*)::int AS n
       FROM nartalis_events e ${scope} AND e.event_name = 'page_view' AND e.source IS NOT NULL
       GROUP BY e.source
       ORDER BY n DESC`,
    )

    const topPages = await sql.query(
      `SELECT e.page, COUNT(*)::int AS n
       FROM nartalis_events e ${scope} AND e.event_name = 'page_view' AND e.page IS NOT NULL
       GROUP BY e.page
       ORDER BY n DESC
       LIMIT 10`,
    )

    const daily = await sql.query(
      `SELECT DATE(e.created_at)::text AS day,
              COUNT(*)::int AS pageviews,
              COUNT(DISTINCT e.visitor_id)::int AS visitors
       FROM nartalis_events e ${scope} AND e.event_name = 'page_view'
       GROUP BY DATE(e.created_at)
       ORDER BY day ASC`,
    )

    return ok({
      exclude: ctx.exclude,
      range: { from: ctx.from || 'inicio', to: ctx.to || 'hoy' },
      totals: aggr,
      period: { pageviews: periodView, visits: periodVisit },
      bySource,
      topPages,
      daily,
    })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── CTA ─────────────────────────────
async function handleCta(ctx: Ctx) {
  try {
    const scope = eventScope(ctx)

    const [totals] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'cta_view') AS impressions,
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'cta_click') AS clicks`,
    )

    const [period] = await sql.query(
      `SELECT
         COUNT(*) FILTER (WHERE e.event_name = 'cta_view' AND e.created_at >= NOW() - INTERVAL '7 days')::int AS view_7d,
         COUNT(*) FILTER (WHERE e.event_name = 'cta_view' AND e.created_at >= NOW() - INTERVAL '30 days')::int AS view_30d,
         COUNT(*) FILTER (WHERE e.event_name = 'cta_view' AND e.created_at >= NOW() - INTERVAL '90 days')::int AS view_90d,
         COUNT(*) FILTER (WHERE e.event_name = 'cta_click' AND e.created_at >= NOW() - INTERVAL '7 days')::int AS click_7d,
         COUNT(*) FILTER (WHERE e.event_name = 'cta_click' AND e.created_at >= NOW() - INTERVAL '30 days')::int AS click_30d,
         COUNT(*) FILTER (WHERE e.event_name = 'cta_click' AND e.created_at >= NOW() - INTERVAL '90 days')::int AS click_90d
       FROM nartalis_events e WHERE e.event_name IN ('cta_view', 'cta_click')
       ${ctx.exclude ? `AND (e.user_id IS NULL OR ${excludeInternalClause('e.user_id')})` : ''}`,
    )

    return ok({ exclude: ctx.exclude, range: { from: ctx.from || 'inicio', to: ctx.to || 'hoy' }, totals, period })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── FUNNEL ─────────────────────────────
// Funnel principal agregado. Las etapas anónimas (nartalis_events) y las
// identificadas (farma_search_log, nartalis_users, ...) NO se unen usuario a
// usuario: la identidad anónima→identificada no es reconstruible. Cada etapa
// se muestra con su fuente. Activation es una PROPUESTA (candidate): usuarios
// con ≥1 medicamento guardado.
async function handleFunnel(ctx: Ctx) {
  try {
    const scope = eventScope(ctx)
    const searchScopeSql = searchScope(ctx, 'keeps_anon')
    const whereU = tableWhere(ctx, 'u.created_at', 'u.id')

    const [anon] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'page_view') AS pageviews,
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'medicine_view') AS medicine_views,
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'medicine_second_view') AS second_interaction,
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'cta_view') AS cta_views,
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'cta_click') AS cta_clicks,
         (SELECT COUNT(*)::int FROM nartalis_events e ${scope} AND e.event_name = 'registration_started') AS registration_started`,
    )

    const [visitsSql] = await sql.query(
      `SELECT COUNT(*)::int AS visits FROM (
         SELECT e.visitor_id, e.created_at,
                LAG(e.created_at) OVER (PARTITION BY e.visitor_id ORDER BY e.created_at) AS prev
         FROM nartalis_events e ${scope} AND e.event_name = 'page_view' AND e.visitor_id IS NOT NULL
       ) w WHERE w.prev IS NULL OR w.created_at - w.prev > INTERVAL '30 minutes'`,
    )

    const [searchesSql] = await sql.query(
      `SELECT COUNT(*)::int AS searches FROM farma_search_log ${searchScopeSql}`,
    )

    const [regSql] = await sql.query(
      `SELECT COUNT(*)::int AS registrations,
              COUNT(DISTINCT u.id) FILTER (WHERE r.id IS NOT NULL)::int AS activated
       FROM nartalis_users u
       LEFT JOIN nartalis_user_medicamentos r ON r.user_id = u.id
       ${whereU}`,
    )

    const retention = await computeRetention(ctx)
    const actTotal = regSql?.registrations ?? 0

    return ok({
      exclude: ctx.exclude,
      range: { from: ctx.from || 'inicio', to: ctx.to || 'hoy' },
      stages: {
        visits: { value: visitsSql?.visits ?? 0, source: 'nartalis_events' },
        pageviews: { value: anon?.pageviews ?? 0, source: 'nartalis_events' },
        medicine_views: { value: anon?.medicine_views ?? 0, source: 'nartalis_events' },
        searches: { value: searchesSql?.searches ?? 0, source: 'farma_search_log' },
        second_interaction: { value: anon?.second_interaction ?? 0, source: 'nartalis_events' },
        cta_views: { value: anon?.cta_views ?? 0, source: 'nartalis_events' },
        cta_clicks: { value: anon?.cta_clicks ?? 0, source: 'nartalis_events' },
        registration_started: { value: anon?.registration_started ?? 0, source: 'nartalis_events' },
        registrations: { value: regSql?.registrations ?? 0, source: 'nartalis_users' },
        activated: { value: regSql?.activated ?? 0, source: 'nartalis_user_medicamentos', candidate: true, basis: actTotal },
      },
      retention,
    })
  } catch (e) {
    return fail(e)
  }
}

// ───────────────────────────── OVERVIEW ─────────────────────────────
async function handleOverview(ctx: Ctx) {
  try {
    const whereU = tableWhere(ctx, 'u.created_at', 'u.id')
    const scope = searchScope(ctx, 'keeps_anon')

    const [users] = await sql.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int AS new_30d
       FROM nartalis_users u ${whereU}`,
    )

    const [search] = await sql.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE was_successful)::int AS with_results,
              COUNT(*) FILTER (WHERE user_id IS NULL)::int AS anonymous,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30d,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days')::int AS last_90d
       FROM farma_search_log ${scope}`,
    )

    const [product] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_user_medicamentos m ${tableWhere(ctx, 'm.created_at', 'm.user_id')}) AS saved,
         (SELECT COUNT(DISTINCT m.user_id)::int FROM nartalis_user_medicamentos m ${tableWhere(ctx, 'm.created_at', 'm.user_id')}) AS users_meds,
         (SELECT COUNT(*)::int FROM nartalis_user_consultas c ${tableWhere(ctx, 'c.consulted_at', 'c.user_id')}) AS consultas,
         (SELECT COUNT(DISTINCT c.user_id)::int FROM nartalis_user_consultas c ${tableWhere(ctx, 'c.consulted_at', 'c.user_id')}) AS users_consultas,
         (SELECT COUNT(DISTINCT u.id)::int FROM nartalis_users u JOIN nartalis_user_medicamentos m ON m.user_id = u.id ${whereU}) AS activated`,
    )

    const [funnel] = await sql.query(
      `SELECT COUNT(DISTINCT u.id)::int AS registered,
              COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN u.id END)::int AS with_consulta,
              COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN u.id END)::int AS with_med
       FROM nartalis_users u
       LEFT JOIN nartalis_user_consultas c ON c.user_id = u.id
       LEFT JOIN nartalis_user_medicamentos m ON m.user_id = u.id
       ${whereU}`,
    )

    const retention = await computeRetention(ctx)

    const eventsScope = eventScope(ctx)
    const [visits] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_events e ${eventsScope} AND e.event_name = 'page_view') AS pageviews,
         (SELECT COUNT(DISTINCT e.visitor_id)::int FROM nartalis_events e ${eventsScope} AND e.event_name = 'page_view' AND e.visitor_id IS NOT NULL) AS visitors,
         (SELECT COUNT(*)::int FROM (
            SELECT e.visitor_id, e.created_at,
                   LAG(e.created_at) OVER (PARTITION BY e.visitor_id ORDER BY e.created_at) AS prev
            FROM nartalis_events e ${eventsScope} AND e.event_name = 'page_view' AND e.visitor_id IS NOT NULL
          ) w WHERE w.prev IS NULL OR w.created_at - w.prev > INTERVAL '30 minutes') AS visits`,
    )
    const [cta] = await sql.query(
      `SELECT
         (SELECT COUNT(*)::int FROM nartalis_events e ${eventsScope} AND e.event_name = 'cta_click') AS clicks,
         (SELECT COUNT(*)::int FROM nartalis_events e ${eventsScope} AND e.event_name = 'cta_view') AS impressions`,
    )

    return ok({
      exclude: ctx.exclude,
      ga4: getGa4Availability(),
      users,
      search,
      product,
      conversion: funnel,
      retention,
      visits,
      cta,
    })
  } catch (e) {
    return fail(e)
  }
}