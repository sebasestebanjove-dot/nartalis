'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'

// Panel analítico de Nartalis (V2 REAL, data propia en Neon).
// Mide el funnel completo con `nartalis_events` (anónimo, sin PII) y tablas
// identificadas (farma_search_log, nartalis_users, botiquín, consultas). El
// anónimo→identificado NO se une por identidad. Cada bloque etiqueta su fuente.

type AnalyticsTab = 'overview' | 'visits' | 'funnel' | 'med-engagement' | 'search' | 'botiquin' | 'conversion' | 'cta' | 'retention' | 'fuentes'

const TABS: { key: AnalyticsTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'visits', label: 'Visitas' },
  { key: 'funnel', label: 'Funnel' },
  { key: 'med-engagement', label: 'Medicine Engagement' },
  { key: 'search', label: 'Search' },
  { key: 'botiquin', label: 'Botiquín' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'cta', label: 'CTA' },
  { key: 'retention', label: 'Retention' },
  { key: 'fuentes', label: 'Fuentes' },
]

export default function AdminAnalyticsView() {
  const [tab, setTab] = useState<AnalyticsTab>('overview')
  const [exclude, setExclude] = useState(true)
  const [range, setRange] = useState('30d')
  const [reload, setReload] = useState(0)

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 0.25rem' }}>Analytics</h1>
      <p style={{ fontSize: 13, color: A.muted, margin: '0 0 1rem', maxWidth: 760 }}>
        Dashboard propio con datos reales en Neon (visitas, funnel, CTA). No se fabrican cifras: los «0» son reales y
        la ausencia de datos se muestra como «Sin datos». GA4 queda como complemento (ver nota al final).
      </p>

      <div style={adminS.toolbar}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {TABS.map((t) => {
            const base = { ...adminS.btnGhost }
            delete base.border
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  ...base,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  ...(tab === t.key ? { background: A.accentSoft, color: A.accentText, borderColor: 'transparent' } : { borderColor: '#3A3A3C' }),
                }}
              >
                {t.label}
              </button>
            )
          })}
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

      <NeonSection tab={tab} exclude={exclude} range={range} reload={reload} />
    </div>
  )
}

// ───────────────────────── Neon: utilidades ─────────────────────────
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

// pct con división por cero segura y muestra insuficiente.
function pct(part: number, total: number): number | null {
  if (!total) return null
  return Math.round((part / total) * 100)
}

function pctLabel(part: number, total: number): string {
  const v = pct(part, total)
  return v === null ? '—' : `${v}%`
}

// Etiquetas de afirmación perimetral (ceros informativos).
function fmt0(n: number | undefined): string {
  return n === undefined ? 'Sin datos' : n.toLocaleString('es-ES')
}

function SourceBadge({ source }: { source: 'GA4' | 'Neon' }) {
  return (
    <span style={adminS.badge}>
      <span style={source === 'GA4' ? adminS.badgePurple : adminS.badgeBlue}>FUENTE: {source}</span>
    </span>
  )
}

// ───────────────────────── Neon: payload types ─────────────────────────
interface OverviewUsers { total: number; new_30d: number }
interface OverviewSearch { total: number; with_results: number; anonymous: number; last_7d: number; last_30d: number; last_90d: number }
interface OverviewProduct { saved: number; users_meds: number; consultas: number; users_consultas: number; activated: number }
interface OverviewConversion { registered: number; with_consulta: number; with_med: number }
interface OverviewRetention { cohort: number; d1: number; d7: number; d30: number }
interface OverviewVisits { pageviews: number; visitors: number; visits: number }
interface OverviewCta { clicks: number; impressions: number }
interface OverviewData { exclude: boolean; users: OverviewUsers; search: OverviewSearch; product: OverviewProduct; conversion: OverviewConversion; retention: OverviewRetention; visits: OverviewVisits; cta: OverviewCta }

interface SearchTotals { total: number; with_results: number; without_results: number; anonymous: number; identified: number; internal: number }
interface SearchPeriod { last_7d: number; last_30d: number; last_90d: number }
interface SearchSource { origin: string; total: number; with_results: number; without_results: number }
interface SearchData {
  exclude: boolean
  range: { from: string; to: string }
  totals: SearchTotals
  identified_users: number
  period: SearchPeriod
  bySource: SearchSource[]
  bySourcePage: SearchSource[]
  daily: { day: string; total: number }[]
  topQueries: { query: string; n: number; with_results: number }[]
  topZero: { query: string; n: number }[]
}

interface MedEngTotals { consulted: number; users: number; users_depth2: number; repeated_med: number }
interface MedEngPeriod { last_7d: number; last_30d: number; last_90d: number }
interface MedEngAnon { medicine_views: number; second_views: number }
interface MedEngAnonPeriod { mv_7d: number; mv_30d: number; mv_90d: number }
interface MedEngData { exclude: boolean; range: { from: string; to: string }; totals: MedEngTotals; period: MedEngPeriod; evolution: { day: string; n: number }[]; topConsulted: { nombre: string; nregistro: string; n: number }[]; anon: MedEngAnon; anonPeriod: MedEngAnonPeriod }

interface BotiquinTotals { saved: number; favorites: number; users_with_meds: number; consultas: number }
interface BotiquinData { exclude: boolean; range: { from: string; to: string }; totals: BotiquinTotals; evolution: { day: string; n: number }[]; topSaved: { nombre: string; nregistro: string; saves: number; favorites: number }[] }

interface RegistrationData { total: number; new_7d: number; new_30d: number }
interface ConversionFunnel { registered: number; with_consulta: number; with_med: number }
interface ActivationData { activated: number; activated_7d: number; activated_30d: number }
interface ConversionData { exclude: boolean; registration: RegistrationData; funnel: ConversionFunnel; activation: ActivationData }

interface RetentionData { exclude: boolean; cohort: number; d1: number; d7: number; d30: number }

interface FuentesData { exclude: boolean; bySource: SearchSource[]; bySourcePage: SearchSource[]; topQueries: { query: string; n: number; with_results: number }[] }

interface VisitsPeriod { pageviews: { v7: number; v30: number; v90: number }; visits: { v7: number; v30: number; v90: number } }
interface VisitsData { exclude: boolean; range: { from: string; to: string }; totals: { pageviews: number; visitors: number; visits: number }; period: VisitsPeriod; bySource: { source: string; n: number }[]; topPages: { page: string; n: number }[]; daily: { day: string; pageviews: number; visitors: number }[] }

interface CtaData { exclude: boolean; range: { from: string; to: string }; totals: { impressions: number; clicks: number }; period: { view_7d: number; view_30d: number; view_90d: number; click_7d: number; click_30d: number; click_90d: number } }

interface FunnelStage { value: number; source: string; candidate?: boolean; basis?: number }
interface FunnelData { exclude: boolean; range: { from: string; to: string }; stages: Record<string, FunnelStage>; retention: OverviewRetention }

// ───────────────────────── Neon: fetch ─────────────────────────
const ACTIVE_TAB_URI: Record<string, string> = {
  overview: 'overview',
  visits: 'visits',
  funnel: 'funnel',
  search: 'search',
  'med-engagement': 'med-engagement',
  botiquin: 'botiquin',
  conversion: 'conversion',
  cta: 'cta',
  retention: 'retention',
  fuentes: 'fuentes',
}

function NeonSection({ tab, exclude, range, reload }: { tab: AnalyticsTab; exclude: boolean; range: string; reload: number }) {
  const [json, setJson] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      setJson(null)
      try {
        const { from, to } = rangeDates(range)
        const p = new URLSearchParams()
        p.set('section', ACTIVE_TAB_URI[tab])
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
    return () => { cancelled = true }
  }, [tab, exclude, range, reload])

  if (error) return <div style={adminS.error}>{error}</div>
  if (!json) return <div style={adminS.empty}>Cargando métricas...</div>

  switch (tab) {
    case 'overview': return <OverviewView d={json as unknown as OverviewData} />
    case 'visits': return <VisitsView d={json as unknown as VisitsData} />
    case 'funnel': return <FunnelView d={json as unknown as FunnelData} />
    case 'search': return <SearchView d={json as unknown as SearchData} />
    case 'med-engagement': return <MedEngagementView d={json as unknown as MedEngData} />
    case 'botiquin': return <BotiquinView d={json as unknown as BotiquinData} />
    case 'conversion': return <ConversionView d={json as unknown as ConversionData} />
    case 'cta': return <CtaView d={json as unknown as CtaData} />
    case 'retention': return <RetentionView d={json as unknown as RetentionData} />
    case 'fuentes': return <FuentesView d={json as unknown as FuentesData} />
    default: return null
  }
}

// ───────────────────────── componentes base ─────────────────────────
function KpiBox({ label, kpiValue, sub, color, state, src }: { label: string; kpiValue?: string | number; sub?: string; color?: string; state?: string; src?: 'GA4' | 'Neon' }) {
  return (
    <div style={adminS.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={adminS.kpiLabel}>{label}</div>
        {src ? <SourceBadge source={src} /> : null}
      </div>
      <div style={{ ...adminS.kpiValue, color: color || A.fg }}>{kpiValue ?? '—'}</div>
      {sub && <div style={adminS.kpiSub}>{sub}</div>}
      {state && <div style={{ fontSize: 11, color: A.faint, marginTop: '0.25rem' }}>{state}</div>}
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <div style={adminS.empty}>Sin datos.</div>
  return (
    <div style={adminS.tableWrap}>
      <table style={adminS.table}>
        <thead>
          <tr>{headers.map((h) => <th key={h} style={adminS.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} style={adminS.td}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: A.faint, marginTop: '0.5rem' }}>{children}</div>
}

// ───────────────────────── OVERVIEW ─────────────────────────
function OverviewView({ d }: { d: OverviewData }) {
  const u = d.users
  const s = d.search
  const p = d.product
  const conv = d.conversion
  const r = d.retention
  const v = d.visits
  const cta = d.cta

  // Ceros informativos / muestra suficiente.
  const cohortEnough = r && r.cohort >= 5
  const d30 = r && r.cohort ? (cohortEnough ? `${pct(r.d30, r.cohort)}%` : '0% — muestra insuficiente') : 'Sin datos'

  return (
    <div>
      <div style={adminS.sectionTitle}>Resumen ejecutivo</div>

      <div style={adminS.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Tráfico (propio)</div>
          <SourceBadge source="Neon" />
        </div>
        <div style={adminS.grid}>
          <KpiBox label="Páginas vistas" kpiValue={fmt0(v?.pageviews)} src="Neon" />
          <KpiBox label="Visitantes" kpiValue={fmt0(v?.visitors)} state="visitantes únicos anónimos" src="Neon" />
          <KpiBox label="Visitas (sesiones)" kpiValue={fmt0(v?.visits)} state="gap de inactividad 30 min" src="Neon" />
          <KpiBox label="CTR de llamada a la acción" kpiValue={cta?.impressions ? `${pct(cta.clicks, cta.impressions)}%` : '—'} state={`${fmt0(cta?.clicks)} clics / ${fmt0(cta?.impressions)} impresiones`} color={A.accentText} src="Neon" />
        </div>
      </div>

      <div style={adminS.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Producto (identificado)</div>
          <SourceBadge source="Neon" />
        </div>
        <div style={adminS.grid}>
          <KpiBox label="Búsquedas" kpiValue={fmt0(s?.total)} sub={`${fmt0(s?.last_7d)} / ${fmt0(s?.last_30d)} / ${fmt0(s?.last_90d)} (7/30/90d)`} src="Neon" />
          <KpiBox label="Búsquedas exitosas" kpiValue={`${fmt0(s?.with_results)} (${pctLabel(s?.with_results ?? 0, s?.total ?? 0)})`} color={A.green} src="Neon" />
          <KpiBox label="Consultas de fichas" kpiValue={fmt0(p?.consultas)} sub={`${fmt0(p?.users_consultas)} usuarios`} src="Neon" />
          <KpiBox label="Medicamentos guardados" kpiValue={fmt0(p?.saved)} sub={`${fmt0(p?.users_meds)} usuarios con botiquín`} color={A.blue} src="Neon" />
          <KpiBox label="Usuarios registrados" kpiValue={fmt0(u?.total)} sub={`${fmt0(u?.new_30d)} nuevos 30d`} src="Neon" />
        </div>
      </div>

      <div style={adminS.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Conversión (identificado)</div>
          <SourceBadge source="Neon" />
        </div>
        <div style={adminS.grid}>
          <KpiBox label="Registrados" kpiValue={fmt0(conv?.registered)} src="Neon" />
          <KpiBox label="Con consulta" kpiValue={`${fmt0(conv?.with_consulta)} (${pctLabel(conv?.with_consulta ?? 0, conv?.registered ?? 0)})`} src="Neon" />
          <KpiBox label="Con medicamento guardado" kpiValue={`${fmt0(conv?.with_med)} (${pctLabel(conv?.with_med ?? 0, conv?.registered ?? 0)})`} color={A.green} src="Neon" />
        </div>
      </div>

      <div style={adminS.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Retención (identificado)</div>
          <SourceBadge source="Neon" />
        </div>
        <div style={adminS.grid}>
          <KpiBox label="Cohorte" kpiValue={fmt0(r?.cohort)} state={r && r.cohort < 5 ? 'muestra pequeña: métricas no significativas' : undefined} src="Neon" />
          <KpiBox label="D1" kpiValue={r && r.cohort ? (cohortEnough ? `${pct(r.d1, r.cohort)}%` : '0% — muestra insuficiente') : 'Sin datos'} src="Neon" />
          <KpiBox label="D7" kpiValue={r && r.cohort ? (cohortEnough ? `${pct(r.d7, r.cohort)}%` : '0% — muestra insuficiente') : 'Sin datos'} src="Neon" />
          <KpiBox label="D30" kpiValue={d30} src="Neon" />
        </div>
      </div>

      <Note>
        Los datos de tráfico son propios (nartalis_events): sin IP/UA/referrer completo, por privacidad. GA4 queda como
        complemento para el desglose de adquisición/source-medium. Registro actual: {fmt0(u?.total)} usuarios.
      </Note>
    </div>
  )
}

// ───────────────────────── SEARCH ─────────────────────────
const ORIGIN_LABELS: Record<string, string> = {
  home: 'Home',
  medicine_page: 'Ficha medicamento',
  espacio: 'Espacio personal',
  no_atribuido: 'No atribuido',
  otros: 'Otros',
  contextual: 'Contextual',
}

function SearchView({ d }: { d: SearchData }) {
  const t = d.totals

  return (
    <div>
      <div style={adminS.sectionTitle}>Búsquedas (Neon)</div>
      <div style={adminS.grid}>
        <KpiBox label="Total (periodo)" kpiValue={fmt0(t?.total)} src="Neon" />
        <KpiBox label="Con resultados" kpiValue={fmt0(t?.with_results)} color={A.green} src="Neon" />
        <KpiBox label="Sin resultados" kpiValue={fmt0(t?.without_results)} color={A.red} src="Neon" />
        <KpiBox label="Tasa de éxito" kpiValue={`${pctLabel(t?.with_results ?? 0, t?.total ?? 0)}`} color={A.accentText} src="Neon" />
        <KpiBox label="Anónimas" kpiValue={fmt0(t?.anonymous)} state="búsquedas, no usuarios" src="Neon" />
        <KpiBox label="Identificadas" kpiValue={fmt0(t?.identified)} color={A.blue} state="excl. admin/test" src="Neon" />
        <KpiBox label="Usuarios que buscaron" kpiValue={fmt0(d?.identified_users)} sub="con sesión, periodo completo" src="Neon" />
        <KpiBox label="Internas (admin/test)" kpiValue={fmt0(t?.internal)} color={A.amber} src="Neon" />
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Búsquedas por ventana (7/30/90d)</div>
        <div style={adminS.card}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[['Últimos 7 días', d.period?.last_7d], ['Últimos 30 días', d.period?.last_30d], ['Últimos 90 días', d.period?.last_90d]].map(([l, v]) => (
              <div key={String(l)}><div style={adminS.kpiLabel}>{l}</div><div style={{ ...adminS.kpiValue, fontSize: 22 }}>{fmt0(v as number)}</div></div>
            ))}
          </div>
          <Note>Las ventanas 7/30/90 se refieren a ahora y son independientes del rango seleccionado.</Note>
        </div>
      </div>

      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Distribución por source (punto de entrada)</div>
        {d.bySource?.length ? (
          <Table
            headers={['Origen', 'Total', 'Con resultados', 'Sin resultados', '%']}
            rows={d.bySource.map((s) => [
              ORIGIN_LABELS[s.origin] || s.origin,
              s.total,
              s.with_results,
              s.without_results,
              pctLabel(s.total, d.totals?.total ?? 0),
            ])}
          />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Distribución por source_page</div>
        {d.bySourcePage?.length ? (
          <Table
            headers={['Origen', 'Total', 'Con resultados', 'Sin resultados', '%']}
            rows={d.bySourcePage.map((s) => [
              ORIGIN_LABELS[s.origin] || s.origin,
              s.total,
              s.with_results,
              s.without_results,
              pctLabel(s.total, d.totals?.total ?? 0),
            ])}
          />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>

      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Evolución temporal</div>
        {d.daily?.length ? (
          <Table headers={['Día', 'Total']} rows={d.daily.map((x) => [x.day, x.total])} />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Queries más frecuentes</div>
        {d.topQueries?.length ? (
          <Table headers={['Consulta', 'N', 'Con resultados', 'Éxito %']} rows={d.topQueries.map((x) => [x.query, x.n, x.with_results, pctLabel(x.with_results ?? 0, x.n)])} />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Queries sin resultados</div>
        {d.topZero?.length ? (
          <Table headers={['Consulta', 'N']} rows={d.topZero.map((x) => [x.query, x.n])} />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

// ───────────────────────── MEDICINE ENGAGEMENT (Neon) ─────────────────────────
function MedEngagementView({ d }: { d: MedEngData }) {
  const t = d.totals
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ ...adminS.sectionTitle, fontSize: 16 }}>Medicine Engagement (Neon)</div>
        <SourceBadge source="Neon" />
      </div>
      <div style={{ ...adminS.card, marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: A.muted, margin: 0 }}>
          Parte identificada del engagement: consultas de fichas registradas por usuarios.<br />
          Los eventos anónimos <b>medicine_view</b> y <b>medicine_second_view</b> se registran en el funnel propio
          (nartalis_events): se muestran abajo. Son profundidades de navegación anónimas, no usan identidad unida a la
          parte identificada.
        </p>
      </div>
      <div style={adminS.grid}>
        <KpiBox label="Consultas de fichas (id.)" kpiValue={fmt0(t?.consulted)} src="Neon" />
        <KpiBox label="Usuarios que consultaron (id.)" kpiValue={fmt0(t?.users)} src="Neon" />
        <KpiBox label="Usuarios con ≥2 fichas (id.)" kpiValue={fmt0(t?.users_depth2)} src="Neon" />
        <KpiBox label="Fichas repetidas (id.)" kpiValue={fmt0(t?.repeated_med)} src="Neon" />
        <KpiBox label="Fichas vistas (anón.)" kpiValue={fmt0(d.anon?.medicine_views)} color={A.blue} state="medicine_view, funnel propio" src="Neon" />
        <KpiBox label="2ª interacción (anón.)" kpiValue={fmt0(d.anon?.second_views)} state="medicine_second_view, funnel propio" src="Neon" />
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Fichas vistas por ventana (anón.)</div>
        <div style={adminS.card}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[['Últimos 7 días', d.anonPeriod?.mv_7d], ['Últimos 30 días', d.anonPeriod?.mv_30d], ['Últimos 90 días', d.anonPeriod?.mv_90d]].map(([l, v]) => (
              <div key={String(l)}><div style={adminS.kpiLabel}>{l}</div><div style={{ ...adminS.kpiValue, fontSize: 22 }}>{fmt0(v as number)}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Por ventana (7/30/90d)</div>
        <div style={adminS.card}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[['Últimos 7 días', d.period?.last_7d], ['Últimos 30 días', d.period?.last_30d], ['Últimos 90 días', d.period?.last_90d]].map(([l, v]) => (
              <div key={String(l)}><div style={adminS.kpiLabel}>{l}</div><div style={{ ...adminS.kpiValue, fontSize: 22 }}>{fmt0(v as number)}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Evolución temporal (consultas)</div>
        {d.evolution?.length ? <Table headers={['Día', 'Consultas']} rows={d.evolution.map((x) => [x.day, x.n])} /> : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Fichas más consultadas</div>
        {d.topConsulted?.length ? <Table headers={['Medicamento', 'Registro', 'Consultas']} rows={d.topConsulted.map((x) => [x.nombre, x.nregistro, x.n])} /> : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

// ───────────────────────── BOTIQUÍN ─────────────────────────
function BotiquinView({ d }: { d: BotiquinData }) {
  const t = d.totals
  const avg = t?.users_with_meds ? (t.saved / t.users_with_meds) : null
  return (
    <div>
      <div style={adminS.sectionTitle}>Botiquín (Neon)</div>
      <div style={adminS.grid}>
        <KpiBox label="Medicamentos añadidos" kpiValue={fmt0(t?.saved)} src="Neon" />
        <KpiBox label="Usuarios con >=1 medicamento" kpiValue={fmt0(t?.users_with_meds)} color={A.green} src="Neon" />
        <KpiBox label="Promedio por usuario" kpiValue={avg === null ? '—' : avg.toFixed(2)} src="Neon" />
        <KpiBox label="Consultas de fichas" kpiValue={fmt0(t?.consultas)} src="Neon" />
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Evolución de añadidos</div>
        {d.evolution?.length ? <Table headers={['Día', 'Añadidos']} rows={d.evolution.map((x) => [x.day, x.n])} /> : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Medicamentos más añadidos</div>
        {d.topSaved?.length ? <Table headers={['Medicamento', 'Registro', 'Añadidos', 'Favoritos']} rows={d.topSaved.map((x) => [x.nombre, x.nregistro, x.saves, x.favorites])} /> : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

// ───────────────────────── CONVERSIÓN ─────────────────────────
function ConversionView({ d }: { d: ConversionData }) {
  const reg = d.registration
  const funnel = d.funnel
  const act = d.activation
  const regTotal = reg?.total ?? 0
  return (
    <div>
      <div style={adminS.sectionTitle}>Conversión: funnel identificado (Neon)</div>
      <div style={{ ...adminS.card, marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: A.muted, marginBottom: '0.75rem' }}>
          Funnel identificado por usuario: <b>registrados → con consulta → con medicamento guardado</b>. Solo se
          muestran tasas cuando el denominador (registrados del periodo) es fiable (mayor que 0).
        </p>
        <div style={adminS.grid}>
          <KpiBox label="Registrados" kpiValue={fmt0(regTotal)} src="Neon" />
          <KpiBox label="Con consulta" kpiValue={`${fmt0(funnel?.with_consulta)} (${pctLabel(funnel?.with_consulta ?? 0, regTotal)})`} src="Neon" />
          <KpiBox label="Con medicamento guardado" kpiValue={`${fmt0(funnel?.with_med)} (${pctLabel(funnel?.with_med ?? 0, regTotal)})`} color={A.green} src="Neon" />
        </div>
        {regTotal === 0 && (
          <Note>Actual hay 0 usuarios registrados: las tasas quedan «—» (no se muestra 0% cuando el denominador no es fiable).</Note>
        )}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Registros</div>
        <div style={adminS.grid}>
          <KpiBox label="Nuevos 7d" kpiValue={fmt0(reg?.new_7d)} src="Neon" />
          <KpiBox label="Nuevos 30d" kpiValue={fmt0(reg?.new_30d)} src="Neon" />
          <KpiBox label="Activación (≥1 guardado)" kpiValue={`${fmt0(act?.activated)} (${pctLabel(act?.activated ?? 0, regTotal)})`} color={A.blue} src="Neon" />
        </div>
      </div>
      <Note>ACTIVACIÓN = usuario con ≥1 medicamento guardado en el periodo. Independiente de last_login_at.</Note>
    </div>
  )
}

// ───────────────────────── RETENCIÓN ─────────────────────────
function RetentionView({ d }: { d: RetentionData }) {
  const cohort = d?.cohort ?? 0
  const enough = cohort >= 5
  const cell = (n?: number) => cohort ? (enough ? `${pct(n ?? 0, cohort)}%` : '0% — muestra insuficiente') : 'Sin datos'
  return (
    <div>
      <div style={adminS.sectionTitle}>Retención (Neon)</div>
      <div style={adminS.grid}>
        <KpiBox label="Tamaño de cohorte" kpiValue={fmt0(cohort)} state={cohort && cohort < 5 ? 'menos de 5 — métricas no significativas' : undefined} src="Neon" />
        <KpiBox label="D1" kpiValue={cell(d?.d1)} src="Neon" />
        <KpiBox label="D7" kpiValue={cell(d?.d7)} src="Neon" />
        <KpiBox label="D30" kpiValue={cell(d?.d30)} src="Neon" />
      </div>
      <Note>
        Retorno por preferencia: búsqueda → consulta → modificación del botiquín, tras el registro. Con cohortes menores a 5 se muestra «muestra
        insuficiente», nunca un porcentaje engañoso. Volumen actual (3 usuarios) es insuficiente para significación.
      </Note>
    </div>
  )
}

// ───────────────────────── FUENTES ─────────────────────────
function FuentesView({ d }: { d: FuentesData }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ ...adminS.sectionTitle, fontSize: 16 }}>Fuentes del producto (Neon)</div>
        <SourceBadge source="Neon" />
      </div>
      <div style={{ ...adminS.card, marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: A.muted, margin: 0 }}>
          Dimensión «punto de entrada» de la búsqueda (<code>source</code> y <code>source_page</code> de farma_search_log).
          No equivale al source/medium de GA4. «Contextual» existe en GA4 (?source=contextual) y no se fabrica aquí.
        </p>
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Por source</div>
        {d.bySource?.length ? (
          <Table
            headers={['Origen', 'Búsquedas', '%', 'Con resultados', 'Sin resultados']}
            rows={d.bySource.map((s) => [ORIGIN_LABELS[s.origin] || s.origin, s.total, pctLabel(s.total, d.bySource.reduce((a, x) => a + x.total, 0)), s.with_results, s.without_results])}
          />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Por source_page</div>
        {d.bySourcePage?.length ? (
          <Table
            headers={['Origen', 'Búsquedas', '%', 'Con resultados', 'Sin resultados']}
            rows={d.bySourcePage.map((s) => [ORIGIN_LABELS[s.origin] || s.origin, s.total, pctLabel(s.total, d.bySourcePage.reduce((a, x) => a + x.total, 0)), s.with_results, s.without_results])}
          />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Queries por fuente (top)</div>
        {d.topQueries?.length ? <Table headers={['Consulta', 'N', 'Con resultados']} rows={d.topQueries.map((x) => [x.query, x.n, x.with_results])} /> : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

// ───────────────────────── VISITAS (propio) ─────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  organic: 'Orgánico',
  direct: 'Directo',
  contextual: 'Contextual',
  internal: 'Interno',
  home: 'Home',
  medicine_page: 'Ficha',
  espacio: 'Espacio',
  otros: 'Otros',
}

function VisitsView({ d }: { d: VisitsData }) {
  const t = d.totals
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ ...adminS.sectionTitle, fontSize: 16 }}>Visitas (propio)</div>
        <SourceBadge source="Neon" />
      </div>
      <div style={{ ...adminS.card, marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: A.muted, margin: 0 }}>
          Tráfico del producto midiendo <b>nartalis_events.page_view</b>, sin PII (sin IP/UA/referrer completo).
          Sesión = gap de inactividad de 30 min. Fuentes: clasificación por el origen de la visita.
        </p>
      </div>
      <div style={adminS.grid}>
        <KpiBox label="Páginas vistas" kpiValue={fmt0(t?.pageviews)} src="Neon" />
        <KpiBox label="Visitantes" kpiValue={fmt0(t?.visitors)} state="anónimos únicos (visitor_id)" src="Neon" />
        <KpiBox label="Visitas (sesiones)" kpiValue={fmt0(t?.visits)} color={A.blue} state="gap 30 min" src="Neon" />
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Por ventana (7/30/90d)</div>
        <div style={adminS.card}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[['Páginas 7d', d.period?.pageviews?.v7], ['Páginas 30d', d.period?.pageviews?.v30], ['Páginas 90d', d.period?.pageviews?.v90],
              ['Visitas 7d', d.period?.visits?.v7], ['Visitas 30d', d.period?.visits?.v30], ['Visitas 90d', d.period?.visits?.v90]].map(([l, v]) => (
              <div key={String(l)}><div style={adminS.kpiLabel}>{l}</div><div style={{ ...adminS.kpiValue, fontSize: 18 }}>{fmt0(v as number)}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Fuentes de tráfico</div>
        {d.bySource?.length ? (
          <Table
            headers={['Fuente', 'Páginas vistas', '%']}
            rows={d.bySource.map((s) => [SOURCE_LABELS[s.source] || s.source, s.n, pctLabel(s.n, d.bySource.reduce((a, x) => a + x.n, 0))])}
          />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Páginas más vistas</div>
        {d.topPages?.length ? (
          <Table headers={['Página', 'Vistas']} rows={d.topPages.map((x) => [x.page, x.n])} />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Evolución diaria</div>
        {d.daily?.length ? (
          <Table headers={['Día', 'Páginas vistas', 'Visitantes']} rows={d.daily.map((x) => [x.day, x.pageviews, x.visitors])} />
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

// ───────────────────────── FUNNEL (propio) ─────────────────────────
const FUNNEL_DEFS: { key: string; label: string }[] = [
  { key: 'visits', label: 'Visitas' },
  { key: 'pageviews', label: 'Páginas vistas' },
  { key: 'medicine_views', label: 'Fichas vistas' },
  { key: 'searches', label: 'Búsquedas' },
  { key: 'second_interaction', label: '2ª interacción' },
  { key: 'cta_views', label: 'CTA vistas' },
  { key: 'cta_clicks', label: 'CTA clics' },
  { key: 'registration_started', label: 'Registro iniciado' },
  { key: 'registrations', label: 'Registros' },
  { key: 'activated', label: 'Activación (≥1 guardado)' },
]

function FunnelView({ d }: { d: FunnelData }) {
  const st = d.stages || {}
  const prevValues = FUNNEL_DEFS.map((def) => st[def.key]?.value ?? 0)
  const enough = (v: number) => v >= 5
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ ...adminS.sectionTitle, fontSize: 16 }}>Funnel global (propio)</div>
        <SourceBadge source="Neon" />
      </div>
      <div style={{ ...adminS.card, marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: A.muted, margin: 0 }}>
          Etapas agregadas desde fuentes de Neon con identidades separadas (anónimo → identificado no se une): cada
          etapa indica su tabla origen. <b>Activación</b> es una propuesta (candidate): usuarios con ≥1 medicamento
          guardado. Las tasas entre etapas anónimas/identificadas son orientativas (no unen usuarios).
        </p>
      </div>
      <div style={adminS.section}>
        {FUNNEL_DEFS.map((def, i) => {
          const stage = st[def.key]
          const value = stage?.value ?? 0
          const prev = prevValues[i - 1]
          const rate = prev ? (enough(prev) ? pctLabel(value, prev) : '—') : '—'
          const sourceChip = stage?.candidate ? (
            <span key="c" style={adminS.badge}><span style={adminS.badgeAmber}>CANDIDATO</span></span>
          ) : null
          return (
            <div key={def.key} style={{ ...adminS.card, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...adminS.kpiLabel, fontSize: 14 }}>{i + 1}. {def.label}</span>
                  {sourceChip}
                </div>
                <div style={{ fontSize: 12, color: A.faint }}>fuente: {stage?.source || '—'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                <div style={{ ...adminS.kpiValue, fontSize: 20 }}>{fmt0(value)}</div>
                <div style={{ fontSize: 12, color: A.muted, width: 56, textAlign: 'right' }}>
                  {i === 0 ? '' : `conv. ${rate}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Retención (cohorte identificada)</div>
        {d.retention ? (
          <div style={adminS.grid}>
            <KpiBox label="Cohorte" kpiValue={fmt0(d.retention.cohort)} src="Neon" />
            <KpiBox label="D1" kpiValue={d.retention.cohort >= 5 ? `${pct(d.retention.d1, d.retention.cohort)}%` : 'muestra insuficiente'} src="Neon" />
            <KpiBox label="D7" kpiValue={d.retention.cohort >= 5 ? `${pct(d.retention.d7, d.retention.cohort)}%` : 'muestra insuficiente'} src="Neon" />
            <KpiBox label="D30" kpiValue={d.retention.cohort >= 5 ? `${pct(d.retention.d30, d.retention.cohort)}%` : 'muestra insuficiente'} src="Neon" />
          </div>
        ) : <div style={adminS.empty}>Sin datos.</div>}
      </div>
    </div>
  )
}

// ───────────────────────── CTA ─────────────────────────
function CtaView({ d }: { d: CtaData }) {
  const t = d.totals
  const ctr = t?.impressions ? `${pct(t.clicks, t.impressions)}%` : '—'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ ...adminS.sectionTitle, fontSize: 16 }}>Llamada a la acción (propio)</div>
        <SourceBadge source="Neon" />
      </div>
      <div style={{ ...adminS.card, marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: A.muted, margin: 0 }}>
          Rendimiento del CTA «Mi espacio»: impresiones (cta_view) y clics (cta_click) en nartalis_events.
        </p>
      </div>
      <div style={adminS.grid}>
        <KpiBox label="Impresiones" kpiValue={fmt0(t?.impressions)} src="Neon" />
        <KpiBox label="Clics" kpiValue={fmt0(t?.clicks)} color={A.blue} src="Neon" />
        <KpiBox label="CTR" kpiValue={ctr} color={A.green} src="Neon" />
      </div>
      <div style={adminS.section}>
        <div style={{ ...adminS.sectionTitle, fontSize: 15 }}>Por ventana (7/30/90d)</div>
        <div style={adminS.card}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[['Impr. 7d', d.period?.view_7d], ['Impr. 30d', d.period?.view_30d], ['Impr. 90d', d.period?.view_90d],
              ['Clics 7d', d.period?.click_7d], ['Clics 30d', d.period?.click_30d], ['Clics 90d', d.period?.click_90d]].map(([l, v]) => (
              <div key={String(l)}><div style={adminS.kpiLabel}>{l}</div><div style={{ ...adminS.kpiValue, fontSize: 18 }}>{fmt0(v as number)}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}