'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'

interface SearchLogData {
  range: { from: string; to: string }
  totals: {
    total: number
    text_count: number
    voice_count: number
    with_results: number
    without_results: number
    anonymous: number
    authenticated: number
  }
  topQueries: { query: string; text_count: number; voice_count: number; total_count: number }[]
  topVoice: { query: string; total_count: number }[]
  topZero: { query: string; total_count: number }[]
  daily: { day: string; total_count: number; voice_count: number }[]
  byUser: { user_id: string; email: string; total: number; text: number; voice: number; success: number }[]
}

const fmtDay = (day: string) => {
  const d = new Date(day + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

export default function AdminSearchesView() {
  const [data, setData] = useState<SearchLogData | null>(null)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [searchType, setSearchType] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (searchType) params.set('search_type', searchType)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/search-log?${params.toString()}`)
        if (!res.ok) throw new Error('no ok')
        const json = await res.json()
        setError('')
        setData(json.data)
      } catch {
        setError('No se pudieron cargar las métricas de búsqueda.')
      }
    })()
  }, [from, to, searchType, reloadKey])

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 1rem' }}>Búsquedas</h1>

      <div style={adminS.toolbar}>
        <input type="date" style={adminS.input} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ fontSize: 13, color: A.muted }}>→</span>
        <input type="date" style={adminS.input} value={to} onChange={(e) => setTo(e.target.value)} />
        <select style={adminS.select} value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <option value="">Tipo: todos</option>
          <option value="text">texto</option>
          <option value="voice">voz</option>
        </select>
        <button style={adminS.btn} onClick={() => setReloadKey((k) => k + 1)}>Aplicar</button>
      </div>

      {error && <div style={adminS.error}>{error}</div>}

      {!data && !error && <div style={adminS.empty}>Cargando métricas...</div>}

      {data && (
        <>
          <div style={adminS.grid}>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Total</div>
              <div style={adminS.kpiValue}>{data.totals.total.toLocaleString('es-ES')}</div>
            </div>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Texto</div>
              <div style={{ ...adminS.kpiValue, color: A.blue }}>{data.totals.text_count}</div>
            </div>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Voz</div>
              <div style={{ ...adminS.kpiValue, color: A.green }}>{data.totals.voice_count}</div>
            </div>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Con resultados</div>
              <div style={{ ...adminS.kpiValue, color: A.green }}>{data.totals.with_results}</div>
            </div>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Sin resultados</div>
              <div style={{ ...adminS.kpiValue, color: A.red }}>{data.totals.without_results}</div>
            </div>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Anónimas</div>
              <div style={adminS.kpiValue}>{data.totals.anonymous}</div>
            </div>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Autenticadas</div>
              <div style={adminS.kpiValue}>{data.totals.authenticated}</div>
            </div>
            <div style={adminS.card}>
              <div style={adminS.kpiLabel}>Éxito %</div>
              <div style={adminS.kpiValue}>
                {data.totals.total ? `${((data.totals.with_results / data.totals.total) * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={adminS.section}>
              <div style={adminS.sectionTitle}>Top consultas</div>
              {data.topQueries.length === 0 ? (
                <div style={adminS.empty}>Sin datos.</div>
              ) : (
                <div style={adminS.tableWrap}>
                  <table style={adminS.table}>
                    <thead>
                      <tr>
                        <th style={adminS.th}>Consulta</th>
                        <th style={adminS.th}>Texto</th>
                        <th style={adminS.th}>Voz</th>
                        <th style={adminS.th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topQueries.map((q) => (
                        <tr key={q.query}>
                          <td style={adminS.td}>{q.query || '—'}</td>
                          <td style={adminS.td}>{q.text_count}</td>
                          <td style={adminS.td}>{q.voice_count}</td>
                          <td style={{ ...adminS.td, fontWeight: 700 }}>{q.total_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={adminS.section}>
              <div style={adminS.sectionTitle}>Top por voz</div>
              {data.topVoice.length === 0 ? (
                <div style={adminS.empty}>Sin datos.</div>
              ) : (
                <div style={adminS.tableWrap}>
                  <table style={adminS.table}>
                    <thead>
                      <tr>
                        <th style={adminS.th}>Consulta</th>
                        <th style={adminS.th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topVoice.map((q) => (
                        <tr key={q.query}>
                          <td style={adminS.td}>{q.query || '—'}</td>
                          <td style={{ ...adminS.td, fontWeight: 700 }}>{q.total_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div style={adminS.section}>
            <div style={adminS.sectionTitle}>Sin resultados</div>
            {data.topZero.length === 0 ? (
              <div style={adminS.empty}>Sin datos.</div>
            ) : (
              <div style={adminS.tableWrap}>
                <table style={adminS.table}>
                  <thead>
                    <tr>
                      <th style={adminS.th}>Consulta</th>
                      <th style={adminS.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topZero.map((q) => (
                      <tr key={q.query}>
                        <td style={adminS.td}>{q.query || '—'}</td>
                        <td style={{ ...adminS.td, fontWeight: 700 }}>{q.total_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={adminS.section}>
            <div style={adminS.sectionTitle}>Por día</div>
            {data.daily.length === 0 ? (
              <div style={adminS.empty}>Sin datos.</div>
            ) : (
              <div style={adminS.tableWrap}>
                <table style={adminS.table}>
                  <thead>
                    <tr>
                      <th style={adminS.th}>Día</th>
                      <th style={adminS.th}>Total</th>
                      <th style={adminS.th}>Voz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.day}>
                        <td style={adminS.td}>{fmtDay(d.day)}</td>
                        <td style={adminS.td}>{d.total_count}</td>
                        <td style={adminS.td}>{d.voice_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={adminS.section}>
            <div style={adminS.sectionTitle}>Por usuario</div>
            {data.byUser.length === 0 ? (
              <div style={adminS.empty}>Sin datos.</div>
            ) : (
              <div style={adminS.tableWrap}>
                <table style={adminS.table}>
                  <thead>
                    <tr>
                      <th style={adminS.th}>Email</th>
                      <th style={adminS.th}>Total</th>
                      <th style={adminS.th}>Texto</th>
                      <th style={adminS.th}>Voz</th>
                      <th style={adminS.th}>Con resultados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byUser.map((u) => (
                      <tr key={u.user_id}>
                        <td style={adminS.td}>{u.email || 'Anónimo'}</td>
                        <td style={adminS.td}>{u.total}</td>
                        <td style={adminS.td}>{u.text}</td>
                        <td style={adminS.td}>{u.voice}</td>
                        <td style={adminS.td}>{u.success}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, color: A.faint, marginTop: '0.5rem' }}>
            Rango: {data.range.from} → {data.range.to}. Búsquedas históricas previas a la fase 6 tienen result_count 0 / was_successful false por defecto.
          </div>
        </>
      )}
    </div>
  )
}
