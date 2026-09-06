import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getNartalisSession } from '@/lib/auth'

// POST /api/analytics/events — beacon de eventos de producto (funnel anónimo).
// Recibe eventos de alto valor del cliente, valida estrictamente (whitelist,
// sin PII) y los persiste en nartalis_events. NUNCA rompe la interacción:
// responde 204 incluso si el INSERT falla.
//
// Seguridad/privacidad:
//  - event_name de whitelist cerrada.
//  - page = pathname sanitizado (sin query/fragment), máx 200 chars.
//  - nregistro numérico/alnum corto (CIMA), máx 10 chars.
//  - source de whitelist.
//  - visitor_id UUID opcional; se acepta pero no se usa para unir con la
//    identidad registrada (anonymous → identified no es reconstruible).
//  - user_id SIEMPRE resuelto server-side desde la sesión (nunca del cliente).

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

  let visitorId: string | null = null
  if (typeof payload.visitor_id === 'string' && UUID_RE.test(payload.visitor_id)) {
    visitorId = payload.visitor_id
  }

  // user_id solo si hay sesión real (server-side).
  let userId: string | null = null
  try {
    const session = await getNartalisSession()
    userId = session?.id ?? null
  } catch { /* sin sesión */ }

  try {
    await sql`
      INSERT INTO nartalis_events (event_name, visitor_id, user_id, page, nregistro, source)
      VALUES (${eventName}, ${visitorId}, ${userId}, ${page}, ${nregistro}, ${source})
    `
  } catch (err) {
    console.error('analytics events insert error:', err)
  }
  return new Response(null, { status: 204 })
}