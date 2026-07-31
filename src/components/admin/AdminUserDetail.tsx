'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'

interface UserDetailData {
  user: {
    id: string
    name: string
    email: string
    primary_provider: string
    plan: string
    role: string
    status: string
    created_at: string
    updated_at: string
    last_login_at: string
  }
  meds: { saved: number; favorites: number }
  consultas: { nregistro: string; nombre: string; consulted_at: string }[]
  searchStats: {
    total_searches: number
    text_searches: number
    voice_searches: number
    last_search_at: string
    last_activity_at: string
  }
}

export default function AdminUserDetail({
  userId,
  onBack,
}: {
  userId: string
  onBack: () => void
}) {
  const [data, setData] = useState<UserDetailData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`)
        if (!res.ok) throw new Error('no ok')
        const json = await res.json()
        setError('')
        setData(json.data)
      } catch {
        setError('No se pudo cargar el detalle del usuario.')
      }
    })()
  }, [userId])

  if (error) return <div style={adminS.error}>{error}</div>
  if (!data) return <div style={adminS.empty}>Cargando detalle...</div>

  const u = data.user
  const fmt = (ts: string | null) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-ES')
  }

  return (
    <div>
      <button style={{ ...adminS.btnGhost, marginBottom: '1rem' }} onClick={onBack}>← Volver a usuarios</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 1rem' }}>{u.name || u.email}</h1>

      <div style={{ ...adminS.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Email</div>
          <div style={{ fontSize: 13, color: A.fg }}>{u.email}</div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Proveedor</div>
          <div style={{ fontSize: 13, color: A.fg }}>{u.primary_provider}</div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Plan</div>
          <div>
            <span style={{ ...adminS.badge, ...(u.plan === 'PREMIUM' ? adminS.badgeAmber : adminS.badgeBlue) }}>{u.plan}</span>
          </div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Rol</div>
          <div>
            <span style={{ ...adminS.badge, ...(u.role === 'ADMIN' ? adminS.badgePurple : adminS.badgeGray) }}>{u.role}</span>
          </div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Estado</div>
          <div>
            <span style={{ ...adminS.badge, ...(u.status === 'ACTIVE' ? adminS.badgeGreen : adminS.badgeRed) }}>{u.status}</span>
          </div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Registro</div>
          <div style={{ fontSize: 13, color: A.fg }}>{fmt(u.created_at)}</div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Último login</div>
          <div style={{ fontSize: 13, color: A.fg }}>{fmt(u.last_login_at)}</div>
        </div>
      </div>

      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Búsquedas ({data.searchStats.total_searches})</div>
        <div style={adminS.grid}>
          <div style={adminS.card}>
            <div style={adminS.kpiLabel}>Texto</div>
            <div style={adminS.kpiValue}>{data.searchStats.text_searches}</div>
          </div>
          <div style={adminS.card}>
            <div style={adminS.kpiLabel}>Voz</div>
            <div style={adminS.kpiValue}>{data.searchStats.voice_searches}</div>
          </div>
          <div style={adminS.card}>
            <div style={adminS.kpiLabel}>Última búsqueda</div>
            <div style={{ fontSize: 13, color: A.muted }}>{fmt(data.searchStats.last_search_at)}</div>
          </div>
          <div style={adminS.card}>
            <div style={adminS.kpiLabel}>Última actividad</div>
            <div style={{ fontSize: 13, color: A.muted }}>{fmt(data.searchStats.last_activity_at)}</div>
          </div>
        </div>
      </div>

      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Guardados ({data.meds.saved}, favoritos {data.meds.favorites})</div>
      </div>

      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Consultas recientes ({data.consultas.length})</div>
        {data.consultas.length === 0 ? (
          <div style={adminS.empty}>Sin consultas.</div>
        ) : (
          <div style={adminS.tableWrap}>
            <table style={adminS.table}>
              <thead>
                <tr>
                  <th style={adminS.th}>Nombre</th>
                  <th style={adminS.th}>Nº Registro</th>
                  <th style={adminS.th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.consultas.map((c, i) => (
                  <tr key={`${c.consulted_at}-${i}`}>
                    <td style={adminS.td}>{c.nombre}</td>
                    <td style={adminS.td}>{c.nregistro || '—'}</td>
                    <td style={adminS.td}>{fmt(c.consulted_at)}</td>
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
