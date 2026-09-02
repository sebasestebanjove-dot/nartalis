'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'

// Panel analítico de Nartalis (FASE A6).
// Separa explícitamente:
//  - FUNNEL DE COMPORTAMIENTO ANÓNIMO (GA4): Acquisition, Medicine Engagement, Fuentes.
//  - FUNNEL DE PRODUCTO IDENTIFICADO (Neon): Search, Botiquín, Conversion, Retention.
// Los bloques GA4 son informativos (datos no accesibles desde el código): definición,
// significado, disponibilidad y enlace al panel GA4. NO se fabrican valores.

const GA4_BASE = 'https://analytics.google.com/analytics/web/'
const GA4_PROP = 'G-QK5NWDSWXV'

type AnalyticsTab = 'overview' | 'acquisition' | 'engagement' | 'search' | 'botiquin' | 'conversion' | 'retention' | 'fuentes'

const TABS: { key: AnalyticsTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'acquisition', label: 'Acquisition' },
  { key: 'engagement', label: 'Medicine Engagement' },
  { key: 'search', label: 'Search' },
  { key: 'botiquin', label: 'Botiquín' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'retention', label: 'Retention' },
  { key: 'fuentes', label: 'Fuentes' },
]

export default function AdminAnalyticsView() {
  const [tab, setTab] = useState<AnalyticsTab>('overview')
  const [exclude, setExclude] = useState(true)
  const [range, setRange] = useState('30d')
  const [reload, setReload] = useState(0)

  const ga4Block = GA4_BLOCKS[tab]

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 0.25rem' }}>Analytics</h1>
      <p style={{ fontSize: 13, color: A.muted, margin: '0 0 1rem', maxWidth: 720 }}>
        Explotación analítica del producto. Se distinguen dos funnels: el <b>anónimo (GA4)</b> y el{' '}
        <b>identificado (Neon)</b>. No se presentan como un funnel unificado por ausencia de identidad fiable entre ambos.
      </p>

      <div style={adminS.toolbar}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...adminS.btnGhost,
                ...(tab === t.key ? { background: A.accentSoft, color: A.accentText, borderColor: 'transparent' } : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={adminS.toolbar}>
        <select style={adminS.select} value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
          <option value="all">Todo el histórico</option>
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: A.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
          Excluir admin/test
          {exclude && <span style={adminS.badge}><span style={adminS.badgeGreen}>activo</span></span>}
        </label>
        <button style={adminS.btn} onClick={() => setReload((k) => k + 1)}>Aplicar</button>
      </div>

      {ga4Block ? (
        <Ga4InfoBlock
          title={ga4Block.title}
          description={ga4Block.description}
          metrics={ga4Block.metrics}
          note={ga4Block.note}
        />
      ) : (
        <NeonSection tab={tab} exclude={exclude} range={range} reload={reload} />
      )}
    </div>
  )
}

// ───────────────────────── GA4 informativo ─────────────────────────
const GA4_BLOCKS: Partial<Record<AnalyticsTab, { title: string; description: string; metrics: { name: string; def: string }[]; note?: string }>> = {
  acquisition: {
    title: 'Acquisition (GA4)',
    description:
      'De dónde llega el tráfico. GA4 es la fuente de verdad del comportamiento anónimo previo al registro. Los datos no son accesibles desde este panel por código (requieren credenciales de la GA4 Data API); se consultan en el panel de Google Analytics.',
    metrics: [
      { name: 'Usuarios', def: 'Usuarios activos en el periodo (GA4).' },
      { name: 'Sesiones', def: 'Sesiones en el periodo.' },
      { name: 'Sesiones por fuente', def: 'Dimensión source/medium: organic, contextual (?source=contextual), internal.' },
      { name: 'Fichas vistas', def: 'Conteo del evento medicine_view.' },
    ],
    note: 'En GA4: Informes → Adquisición → Resumen de tráfico. Filtro por evento medicine_view si quieres apenas fichas.',
  },
  engagement: {
    title: 'Medicine Engagement (GA4)',
    description:
      'Profundidad de navegación entre fichas. Solo GA4: no se duplica en Neon. medicine_second_view representa la primera transición 1→2 fichas distintas por sesión (1/sesión, memoria de 30 min), NO el total de usuarios con 2 fichas.',
    metrics: [
      { name: 'Usuarios con ≥1 ficha', def: 'Usuarios que emitieron medicine_view.' },
      { name: 'Usuarios con ≥2 fichas', def: 'Usuarios que emitieron medicine_second_view.' },
      { name: 'medicine_second_view', def: 'Conteo del evento (por sesión).' },
      { name: 'Ratio de profundidad', def: 'medicine_second_view ÷ medicine_view.' },
    ],
    note: 'En GA4: Realtime/Eventos → filtrar por nombre de evento medicine_view y medicine_second_view.',
  },
  fuentes: {
    title: 'Fuentes de adquisición (GA4)',
    description:
      'Comparativa organic vs contextual vs internal: qué tráfico tiene mayor calidad de engagement. Requiere GA4 (source/medium). No disponible desde código.',
    metrics: [
      { name: 'Usuarios por fuente', def: 'Usuarios segmentados por source.' },
      { name: 'medicine_view por fuente', def: 'Fichas vistas por fuente.' },
      { name: 'medicine_second_view por fuente', def: 'Transiciones a segunda ficha por fuente.' },
      { name: 'Ratio de engagement por fuente', def: 'medicine_second_view ÷ medicine_view, por fuente.' },
    ],
    note: 'En GA4: Explorar → Crear exploración → segmentar por fuente de tráfico y evento.',
  },
}

function Ga4InfoBlock({
  title,
  description,
  metrics,
  note,
}: {
  title: string
  description: string
  metrics: { name: string; def: string }[]
  note?: string
}) {
  return (
    <div>
      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>{title}</div>
        <div style={{ ...adminS.card, marginBottom: '1rem' }}>
          <span style={adminS.badge}><span style={adminS.badgePurple}>FUENTE: GA4</span></span>
          <p style={{ fontSize: 13, color: A.muted, margin: '0.6rem 0 0' }}>{description}</p>
        </div>
        <div style={adminS.grid}>
          {metrics.map((m) => (
            <div key={m.name} style={adminS.card}>
              <div style={adminS.kpiLabel}>{m.name}</div>
              <div style={{ fontSize: 12, color: A.muted, marginTop: '0.25rem' }}>{m.def}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={adminS.badge}><span style={adminS.badgeGray}>Consultar en GA4</span></span>
              </div>
            </div>
          ))}
        </div>
        {note && (
          <div style={{ fontSize: 12, color: A.faint, marginTop: '0.5rem' }}>
            {note} Propiedad GA4: {GA4_PROP}.{' '}
            <a href={GA4_BASE} target="_blank" rel="noopener noreferrer" style={{ color: A.accentText }}>
              Abrir Google Analytics
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Neon sections ─────────────────────────
function rangeDates(range: string): { from: string | null; to: string | null } {
  const to = new Date()
  const from = new Date()
  if (range === '7d') from.setDate(to.getDate() - 7)
  else if (range === '30d') from.setDate(to.getDate() - 30)
  else if (range === '90d') from.setDate(to.getDate() - 90)
  else return { from: null, to: null }
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { from: iso(from), to: iso(to) }
}

// ───────────────────────── Neon section payload types ─────────────────────────
interface OverviewUsers { total: number; new_30d: number }
interface OverviewSearch { total: number; with_results: number; anonymous: number }
interface OverviewProduct { saved: number; users_meds: number; activated: number }
interface OverviewData { exclude: boolean; users: OverviewUsers; search: OverviewSearch; product: OverviewProduct }

interface SearchTotals { total: number; with_results: number; without_results: number; anonymous: number; identified: number; internal: number }
interface SearchSource { origin: string; total: number; with_results: number; without_results: number }
interface SearchData { exclude: boolean; totals: SearchTotals; bySource: SearchSource[]; daily: { day: string; total: number }[]; topZero: { query: string; n: number }[] }

interface BotiquinTotals { saved: number; favorites: number; users_with_meds: number; consultas: number }
interface BotiquinData { exclude: boolean; totals: BotiquinTotals; evolution: { day: string; n: number }[]; topSaved: { nombre: string; nregistro: string; saves: number; favorites: number }[] }

interface RegistrationData { total: number; new_7d: number; new_30d: number }
interface ActivationData { activated: number; activated_7d: number; activated_30d: number }
interface ConversionData { exclude: boolean; registration: RegistrationData; activation: ActivationData }

interface RetentionData { exclude: boolean; cohort: number; d1: number; d7: number; d30: number }

type SectionData = OverviewData | SearchData | BotiquinData | ConversionData | RetentionData

function NeonSection({ tab, exclude, range, reload }: { tab: AnalyticsTab; exclude: boolean; range: string; reload: number }) {
  const [json, setJson] = useState<SectionData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      setJson(null)
      try {
        const { from, to } = rangeDates(range)
        const p = new URLSearchParams()
        p.set('section', tab)
        p.set('exclude', exclude ? '1' : '0')
        if (from) p.set('from', from)
        if (to) p.set('to', to)
        const res = await fetch(`/api/admin/analytics?${p.toString()}`)
        if (!res.ok) throw new Error('no ok')
        const data = await res.json()
        if (!cancelled) setJson(data.data)
      } catch {
        if (!cancelled) setError('No se pudieron cargar las métricas.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tab, exclude, range, reload])

  if (error) return <div style={adminS.error}>{error}</div>
  if (!json) return <div style={adminS.empty}>Cargando métricas...</div>

  switch (tab) {
    case 'overview':
      return <OverviewView d={json as OverviewData} exclude={exclude} />
    case 'search':
      return <SearchView d={json as SearchData} />
    case 'botiquin':
      return <BotiquinView d={json as BotiquinData} />
    case 'conversion':
      return <ConversionView d={json as ConversionData} />
    case 'retention':
      return <RetentionView d={json as RetentionData} />
    default:
      return null
  }
}

// Reglas de estado: 0 / Sin datos / Datos insuficientes.
function stateLabel(n: number | null | undefined, sufficient: boolean): { text: string; color?: string } {
  if (n === null || n === undefined) return { text: 'Sin datos', color: A.faint }
  if (!sufficient) return { text: 'Datos insuficientes', color: A.amber }
  return { text: n.toLocaleString('es-ES'), color: A.fg }
}

function KpiBox({ label, value, sub, color, state }: { label: string; value?: string | number; sub?: string; color?: string; state?: string }) {
  return (
    <div style={adminS.card}>
      <div style={adminS.kpiLabel}>{label}</div>
      <div style={{ ...adminS.kpiValue, color: color || A.fg }}>{value ?? '—'}</div>
      {sub && <div style={adminS.kpiSub}>{sub}</div>}
      {state && <div style={{ fontSize: 11, color: A.faint, marginTop: '0.25rem' }}>{state}</div>}
    </div>
  )
}

function OverviewView({ d, exclude }: { d: OverviewData; exclude: boolean }) {
  const users = d.users?.total ?? 0
  const activated = d.product?.activated ?? 0
  const searchTotal = d.search?.total ?? 0
  const medsSaved = d.product?.saved ?? 0
  const usersMed = d.product?.users_meds ?? 0
  const activationRate = users > 0 ? Math.round((activated / users) * 100) : null
  return (
    <div>
      <div style={adminS.sectionTitle}>Resumen ejecutivo</div>
      <div style={adminS.grid}>
        <KpiBox label="Usuarios registrados" value={users} state={exclude ? 'excl. admin/test' : 'incl. admin/test'} />
        <KpiBox label="Activados (≥1 med)" value={activated} color={A.green} />
        <KpiBox label="Tasa de activación" value={activationRate === null ? 'Sin datos' : `${activationRate}%`} color={A.accentText} />
        <KpiBox label="Medicamentos guardados" value={medsSaved} color={A.blue} />
        <KpiBox label="Usuarios con botiquín" value={usersMed} />
        <KpiBox label="Búsquedas (periodo)" value={searchTotal} color={A.amber} />
      </div>
      <div style={{ fontSize: 12, color: A.faint, marginTop: '0.5rem' }}>
        Los datos de adquisición y engagement (GA4) se consultan en los apartados correspondientes; no se mezclan con estos registros identificados.
      </div>
    </div>
  )
}

function SearchView({ d }: { d: SearchData }) {
  const t = d.totals
  const successPct = t?.total ? ((t.with_results / t.total) * 100).toFixed(1) : null
  return (
    <div>
      <div style={adminS.sectionTitle}>Búsquedas (Neon)</div>
      <div style={adminS.grid}>
        <KpiBox label="Total" value={t?.total ?? 'Sin datos'} />
        <KpiBox label="Con resultados" value={t?.with_results ?? 'Sin datos'} color={A.green} />
        <KpiBox label="Sin resultados" value={t?.without_results ?? 'Sin datos'} color={A.red} />
        <KpiBox label="Éxito %" value={successPct === null ? 'Sin datos' : `${successPct}%`} color={A.accentText} />
        <KpiBox label="Anónimas" value={t?.anonymous ?? 'Sin datos'} />
        <KpiBox label="Identificadas (excl. interno)" value={t?.identified ?? 'Sin datos'} color={A.blue} />
        <KpiBox label="Internas (admin/test)" value={t?.internal ?? 'Sin datos'} color={A.amber} />
      </div>

      <div style={adminS.section}><div style={adminS.sectionTitle}>Origen de las búsquedas</div>
        {d.bySource?.length ? (
          <div style={adminS.tableWrap}><table style={adminS.table}>
            <thead><tr><th style={adminS.th}>Origen</th><th style={adminS.th}>Total</th><th style={adminS.th}>Con resultados</th><th style={adminS.th}>Sin resultados</th></tr></thead>
            <tbody>
              {d.bySource.map((s: SearchSource) => (
                <tr key={s.origin}><td style={adminS.td}>{s.origin}</td><td style={adminS.td}>{s.total}</td><td style={adminS.td}>{s.with_results}</td><td style={adminS.td}>{s.without_results}</td></tr>
              ))}
            </tbody>
          </table></div>
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>

      <div style={adminS.section}><div style={adminS.sectionTitle}>Evolución diaria</div>
        {d.daily?.length ? (
          <div style={adminS.tableWrap}><table style={adminS.table}>
            <thead><tr><th style={adminS.th}>Día</th><th style={adminS.th}>Total</th></tr></thead>
            <tbody>
              {d.daily.map((x: { day: string; total: number }) => (
                <tr key={x.day}><td style={adminS.td}>{x.day}</td><td style={adminS.td}>{x.total}</td></tr>
              ))}
            </tbody>
          </table></div>
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>

      <div style={adminS.section}><div style={adminS.sectionTitle}>Consultas sin resultados</div>
        {d.topZero?.length ? (
          <div style={adminS.tableWrap}><table style={adminS.table}>
            <thead><tr><th style={adminS.th}>Consulta</th><th style={adminS.th}>N</th></tr></thead>
            <tbody>
              {d.topZero.map((x: { query: string; n: number }) => (
                <tr key={x.query}><td style={adminS.td}>{x.query}</td><td style={adminS.td}>{x.n}</td></tr>
              ))}
            </tbody>
          </table></div>
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

function BotiquinView({ d }: { d: BotiquinData }) {
  const t = d.totals
  return (
    <div>
      <div style={adminS.sectionTitle}>Botiquín (Neon)</div>
      <div style={adminS.grid}>
        <KpiBox label="Medicamentos guardados" value={t?.saved ?? 'Sin datos'} color={A.blue} />
        <KpiBox label="Favoritos" value={t?.favorites ?? 'Sin datos'} color={A.amber} />
        <KpiBox label="Usuarios con botiquín" value={t?.users_with_meds ?? 'Sin datos'} />
        <KpiBox label="Consultas" value={t?.consultas ?? 'Sin datos'} color={A.green} />
      </div>
      <div style={adminS.section}><div style={adminS.sectionTitle}>Evolución de guardados</div>
        {d.evolution?.length ? (
          <div style={adminS.tableWrap}><table style={adminS.table}>
            <thead><tr><th style={adminS.th}>Día</th><th style={adminS.th}>Guardados</th></tr></thead>
            <tbody>
              {d.evolution.map((x: { day: string; n: number }) => (
                <tr key={x.day}><td style={adminS.td}>{x.day}</td><td style={adminS.td}>{x.n}</td></tr>
              ))}
            </tbody>
          </table></div>
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}><div style={adminS.sectionTitle}>Medicamentos más guardados</div>
        {d.topSaved?.length ? (
          <div style={adminS.tableWrap}><table style={adminS.table}>
            <thead><tr><th style={adminS.th}>Medicamento</th><th style={adminS.th}>Guardados</th><th style={adminS.th}>Favoritos</th></tr></thead>
            <tbody>
              {d.topSaved.map((x: { nombre: string; nregistro: string; saves: number; favorites: number }) => (
                <tr key={x.nregistro}><td style={adminS.td}>{x.nombre}</td><td style={adminS.td}>{x.saves}</td><td style={adminS.td}>{x.favorites}</td></tr>
              ))}
            </tbody>
          </table></div>
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

function ConversionView({ d }: { d: ConversionData }) {
  const reg = d.registration
  const act = d.activation
  const rate = reg?.total ? Math.round((act?.activated / reg.total) * 100) : null
  return (
    <div>
      <div style={adminS.sectionTitle}>Conversión: Registro + Activación (Neon)</div>
      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Registros</div>
        <div style={adminS.grid}>
          <KpiBox label="Registrados (total)" value={reg?.total ?? 'Sin datos'} />
          <KpiBox label="Nuevos 7d" value={reg?.new_7d ?? 'Sin datos'} />
          <KpiBox label="Nuevos 30d" value={reg?.new_30d ?? 'Sin datos'} />
        </div>
      </div>
      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Activación (≥1 medicamento guardado)</div>
        <div style={adminS.grid}>
          <KpiBox label="Activados" value={act?.activated ?? 'Sin datos'} color={A.green} />
          <KpiBox label="Activados 30d" value={act?.activated_30d ?? 'Sin datos'} />
          <KpiBox label="Tasa de activación" value={rate === null ? 'Sin datos' : `${rate}%`} color={A.accentText} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: A.faint, marginTop: '0.5rem' }}>
        ACTIVACIÓN = usuario registrado con ≥1 medicamento guardado en el botiquín. Independiente de last_login_at.
      </div>
    </div>
  )
}

function RetentionView({ d }: { d: RetentionData }) {
  const cohort = d?.cohort ?? 0
  const enough = cohort >= 5
  const d1 = stateLabel(cohort ? d?.d1 : null, enough)
  const d7 = stateLabel(cohort ? d?.d7 : null, enough)
  const d30 = stateLabel(cohort ? d?.d30 : null, enough)
  const ret1 = enough && cohort ? Math.round((d.d1 / cohort) * 100) : null
  const ret7 = enough && cohort ? Math.round((d.d7 / cohort) * 100) : null
  const ret30 = enough && cohort ? Math.round((d.d30 / cohort) * 100) : null
  return (
    <div>
      <div style={adminS.sectionTitle}>Retención (Neon)</div>
      <div style={adminS.grid}>
        <KpiBox label="Tamaño de cohorte" value={cohort ? cohort.toLocaleString('es-ES') : 'Sin datos'} sub={cohort && cohort < 5 ? 'menos de 5 → insuficiente' : undefined} />
      </div>
      <div style={adminS.section}><div style={adminS.sectionTitle}>Usuarios que vuelven</div>
        <div style={adminS.grid}>
          <KpiBox label="D1" value={d1.text} color={d1.color} sub={ret1 !== null ? `${ret1}%` : undefined} />
          <KpiBox label="D7" value={d7.text} color={d7.color} sub={ret7 !== null ? `${ret7}%` : undefined} />
          <KpiBox label="D30" value={d30.text} color={d30.color} sub={ret30 !== null ? `${ret30}%` : undefined} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: A.faint, marginTop: '0.5rem' }}>
        Actividad de retorno (por preferencia): búsqueda → consulta → modificación del botiquín, tras el registro. Se muestra «Datos insuficientes» con cohortes menores a 5; nunca un porcentaje engañoso.
      </div>
    </div>
  )
}
