'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'

interface ActivityData {
  recentSearches: {
    query: string
    search_type: string
    result_count: number
    was_successful: boolean
    created_at: string
    user_id: string | null
    user_email: string | null
  }[]
  recentRegistrations: {
    id: string
    name: string
    email: string
    plan: string
    created_at: string
  }[]
}

const fmt = (ts: string) => {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-ES')
}

export default function AdminActivityView() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/activity')
        if (!res.ok) throw new Error('no ok')
        const json = await res.json()
        setData(json.data)
      } catch {
        setError('No se pudieron cargar los eventos recientes.')
      }
    })()
  }, [])

  if (error) return <div style={adminS.error}>{error}</div>
  if (!data) return <div style={adminS.empty}>Cargando actividad...</div>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 1rem' }}>Actividad</h1>

      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Últimas búsquedas</div>
        {data.recentSearches.length === 0 ? (
          <div style={adminS.empty}>Sin búsquedas registradas.</div>
        ) : (
          <div style={adminS.tableWrap}>
            <table style={adminS.table}>
              <thead>
                <tr>
                  <th style={adminS.th}>Fecha</th>
                  <th style={adminS.th}>Consulta</th>
                  <th style={adminS.th}>Tipo</th>
                  <th style={adminS.th}>Resultados</th>
                  <th style={adminS.th}>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSearches.map((s, i) => (
                  <tr key={`${s.created_at}-${i}`}>
                    <td style={adminS.td}>{fmt(s.created_at)}</td>
                    <td style={adminS.td}>{s.query || '—'}</td>
                    <td style={adminS.td}>
                      <span style={{ ...adminS.badge, ...(s.search_type === 'voice' ? adminS.badgeGreen : adminS.badgeBlue) }}>
                        {s.search_type}
                      </span>
                    </td>
                    <td style={adminS.td}>
                      <span
                        style={{
                          ...adminS.badge,
                          ...(s.was_successful ? adminS.badgeGreen : adminS.badgeRed),
                        }}
                      >
                        {s.result_count}
                      </span>
                    </td>
                    <td style={{ ...adminS.td, color: A.muted, fontSize: 12 }}>{s.user_email || 'Anónimo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Últimos registros</div>
        {data.recentRegistrations.length === 0 ? (
          <div style={adminS.empty}>Sin registros.</div>
        ) : (
          <div style={adminS.tableWrap}>
            <table style={adminS.table}>
              <thead>
                <tr>
                  <th style={adminS.th}>Fecha</th>
                  <th style={adminS.th}>Nombre</th>
                  <th style={adminS.th}>Email</th>
                  <th style={adminS.th}>Plan</th>
                </tr>
              </thead>
              <tbody>
                {data.recentRegistrations.map((u) => (
                  <tr key={u.id}>
                    <td style={adminS.td}>{fmt(u.created_at)}</td>
                    <td style={adminS.td}>{u.name || '—'}</td>
                    <td style={adminS.td}>{u.email}</td>
                    <td style={adminS.td}>
                      <span style={{ ...adminS.badge, ...(u.plan === 'PREMIUM' ? adminS.badgeAmber : adminS.badgeBlue) }}>
                        {u.plan}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
