import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getNartalisSession } from '@/lib/auth'
import { getTrackingIds } from '@/lib/search-tracking'
import { resolveIdentity, linkAnonymousToUser } from '@/lib/identity'

// POST /api/analytics/events — beacon de eventos de producto (funnel unificado).
// Recibe eventos de alto valor del cliente, valida estrictamente (whitelist,
// sin PII) y los persiste en nartalis_events con identidad unificada.
// NUNCA rompe la interacción: responde 204 incluso si el INSERT falla.
//
// Identidad unificada:
//  - anonymous_id: identidad anónima principal (cookie HttpOnly, 1 año)
//  - session_id: sesión unificada (30 min inactividad) - MISMA que farma_search_log
//  - user_id: solo si hay sesión real (server-side)
//  - visitor_id: mantenido por compatibilidad histórica
//  - person_key: identidad canónica resuelta (user:<id> | anon:<id>)

const EVENT_NAMES = new Set([
  'page_view',
  'medicine_view',
  'medicine_second_view',
  'cta_view',
  'cta_click',
  'registration_started',
])

const SOURCES = new Set(['organic', 'direct', 'contextual', 'internal'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NPAGE_RE = /^\/[^?#]{0,200}$/

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: 204 })
  }
  if (typeof body !== 'object' || body === null) {
    return new Response(null, { status: 204 })
  }
  const payload = body as Record<string, unknown>

  const eventName = typeof payload.event_name === 'string' ? payload.event_name : ''
  if (!EVENT_NAMES.has(eventName)) {
    return new Response(null, { status: 204 })
  }

  const page = typeof payload.page === 'string' && NPAGE_RE.test(payload.page) ? payload.page : null
  let nregistro: string | null = null
  if (typeof payload.nregistro === 'string') {
    const nr = payload.nregistro.trim().slice(0, 10)
    if (/^[A-Za-z0-9]{1,10}$/.test(nr)) nregistro = nr
  }
  const source = typeof payload.source === 'string' && SOURCES.has(payload.source) ? payload.source : null

  // visitor_id mantenido por compatibilidad (client-side localStorage)
  let visitorId: string | null = null
  if (typeof payload.visitor_id === 'string' && UUID_RE.test(payload.visitor_id)) {
    visitorId = payload.visitor_id
  }

  // anonymous_id y session_id: preferir server-side (cookies HttpOnly)
  // El cliente puede enviarlos, pero server-side tiene prioridad
  let anonymousId: string | null = null
  if (typeof payload.anonymous_id === 'string' && UUID_RE.test(payload.anonymous_id)) {
    anonymousId = payload.anonymous_id
  }
  let sessionId: string | null = null
  if (typeof payload.session_id === 'string' && UUID_RE.test(payload.session_id)) {
    sessionId = payload.session_id
  }

  // user_id solo si hay sesión real (server-side).
  let userId: string | null = null
  try {
    const session = await getNartalisSession()
    userId = session?.id ?? null
  } catch { /* sin sesión */ }

  // Resolver identidad canónica: obtener tracking IDs server-side como fallback
  let trackingAnonymousId: string | null = null
  let trackingSessionId: string | null = null
  try {
    const tracking = await getTrackingIds()
    trackingAnonymousId = tracking.anonymousId
    trackingSessionId = tracking.sessionId
  } catch { /* sin tracking */ }

  // Prioridad: client payload > server tracking
  anonymousId = anonymousId ?? trackingAnonymousId
  sessionId = sessionId ?? trackingSessionId

  // Si hay user_id (usuario logueado) y anonymous_id, vincular en identity_map
  if (userId && (anonymousId || visitorId)) {
    try {
      await linkAnonymousToUser({ anonymousId, visitorId, userId })
    } catch { /* silencioso */ }
  }

  // Resolver identidad canónica para métricas
  let resolved: { personKey: string; userId: string | null; anonymousId: string | null; sessionId: string | null } | null = null
  try {
    const identity = await resolveIdentity({ anonymousId, visitorId, userId, sessionId })
    resolved = {
      personKey: identity.personKey,
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      sessionId: identity.sessionId,
    }
  } catch { /* silencioso */ }

  try {
    await sql`
      INSERT INTO nartalis_events (
        event_name, visitor_id, user_id, page, nregistro, source,
        anonymous_id, session_id
      )
      VALUES (
        ${eventName}, ${visitorId}, ${resolved?.userId ?? userId}, 
        ${page}, ${nregistro}, ${source},
        ${resolved?.anonymousId ?? anonymousId}, ${resolved?.sessionId ?? sessionId}
      )
    `
  } catch (err) {
    console.error('analytics events insert error:', err)
  }
  return new Response(null, { status: 204 })
}