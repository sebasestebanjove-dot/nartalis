'use client'

// Eventos de producto Nartalis (funnel anónimo propio).
// Persiste en Neon (nartalis_events) eventos de alto valor que antes solo
// vivían en GA4: page_view, medicine_view, medicine_second_view, cta_view,
// cta_click, registration_started.
//
// Dos formas de uso:
//   - emit(event, opts)   → GA4 (track) + Neon. Para instrumentación NUEVA
//                           (page_view del layout), donde no existía GA4.
//   - persist(event)      → SOLO Neon. Para call-sites que YA emiten track()
//                           (medicine_view, CTA, registro): evita duplicar el
//                           evento en GA4 (regla: no duplicar eventos GA4).
//
// Sin PII: visitor_id = UUID aleatorio (localStorage); nunca IP, User-Agent,
// referrer completo ni fingerprint. page = pathname sin query.
// Fire-and-forget: nunca bloquea ni rompe la interacción del usuario.

import { track } from '@/lib/analytics'

const LOCAL_VISITOR_KEY = 'nartalis_visitor_id'

// Clave de localStorage por evento: aísla el cooldown de cada evento de los
// demás (antes un único timestamp global bloqueaba events posteriores, p.ej.
// page_view → medicine_view).
function getLastEmitKey(event: ProductEventName): string {
  return `nartalis_last_${event}_at`
}

export type ProductEventName =
  | 'page_view'
  | 'medicine_view'
  | 'medicine_second_view'
  | 'cta_view'
  | 'cta_click'
  | 'registration_started'

// Cooldown suave por evento para evitar dobles emisiones del mismo mount.
const EVENT_COOLDOWN_MS: Partial<Record<ProductEventName, number>> = {
  page_view: 800,
  medicine_view: 1500,
  medicine_second_view: 1500,
  cta_view: 1000,
  cta_click: 0,
  registration_started: 0,
}

export type ProductEventSource = 'organic' | 'direct' | 'contextual' | 'internal'

const SEARCH_ENGINE_RE = /(google|bing|duckduckgo|yahoo|ecosia|brave)\./i

export interface ProductEventOpts {
  page?: string
  nregistro?: string
  source?: ProductEventSource
  ga4Extra?: Record<string, string | number | boolean>
}

function emitToGA4(event: ProductEventName, opts: ProductEventOpts, page: string, source: ProductEventSource) {
  track(event, {
    page,
    ...(opts.nregistro ? { nregistro: opts.nregistro } : {}),
    source,
    ...(opts.ga4Extra || {}),
  })
}

async function persistToNeon(event: ProductEventName, opts: ProductEventOpts, page: string, source: ProductEventSource) {
  const visitorId = getVisitorId()
  try {
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_name: event,
        visitor_id: visitorId,
        page: sanitizePage(page),
        ...(opts.nregistro ? { nregistro: opts.nregistro } : {}),
        source,
      }),
    })
  } catch { /* fire-and-forget */ }
}

function cooldownPasses(event: ProductEventName): boolean {
  const min = EVENT_COOLDOWN_MS[event]
  if (!min || min <= 0) return true
  try {
    const key = getLastEmitKey(event)
    const last = Number(localStorage.getItem(key) || 0)
    const now = Date.now()
    if (last && now - last < min) return false
    localStorage.setItem(key, String(now))
  } catch { /* sin almacenamiento: se emite */ }
  return true
}

// Emite evento a GA4 + Neon (instrumentación nueva).
export function emit(event: ProductEventName, opts: ProductEventOpts = {}) {
  const cfgPage = opts.page || (typeof window !== 'undefined' ? window.location.pathname : '')
  const source = opts.source || detectSource()
  emitToGA4(event, opts, cfgPage, source)
  if (!cooldownPasses(event)) return
  void persistToNeon(event, opts, cfgPage, source)
}

// Solo persiste en Neon, sin tocar GA4 (call-sites ya instrumentalizados).
export function persist(event: ProductEventName, opts: ProductEventOpts = {}) {
  const cfgPage = opts.page || (typeof window !== 'undefined' ? window.location.pathname : '')
  const source = opts.source || detectSource()
  if (!cooldownPasses(event)) return
  void persistToNeon(event, opts, cfgPage, source)
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(LOCAL_VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(LOCAL_VISITOR_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function sanitizePage(page: string): string | null {
  if (!page) return null
  const cleaned = page.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (!cleaned || !cleaned.startsWith('/')) return null
  const path = cleaned.split(/[?#]/)[0] || '/'
  return path.slice(0, 200)
}

export function detectSource(): ProductEventSource {
  if (typeof window === 'undefined') return 'internal'
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('source') === 'contextual') return 'contextual'
  } catch { /* sin query */ }
  try {
    const ref = document.referrer || ''
    if (!ref) return 'direct'
    const host = new URL(ref).hostname
    if (SEARCH_ENGINE_RE.test(host)) return 'organic'
  } catch { /* referrer vacío o inválido */ }
  return 'internal'
}