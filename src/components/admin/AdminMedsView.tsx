'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'

interface MedsData {
  mostSaved: { nombre: string; nregistro: string; saves: number; favorites: number }[]
  mostFavorited: { nombre: string; nregistro: string; favorites: number }[]
  mostConsulted: { nombre: string; nregistro: string; consultas: number }[]
  totals: {
    saved_total: number
    favorites_total: number
    consultas_total: number
    users_saved: number
    users_consulted: number
  }
}

export default function AdminMedsView() {
  const [data, setData] = useState<MedsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/meds')
        if (!res.ok) throw new Error('no ok')
        const json = await res.json()
        setData(json.data)
      } catch {
        setError('No se pudieron cargar las métricas de medicamentos.')
      }
    })()
  }, [])

  if (error) return <div style={adminS.error}>{error}</div>
  if (!data) return <div style={adminS.empty}>Cargando medicamentos...</div>

  const { totals: t } = data

  const renderTable = (
    rows: { nombre: string; nregistro?: string; [k: string]: unknown }[],
    countKey: string,
    countLabel: string
  ) =>
    rows.length === 0 ? (
      <div style={adminS.empty}>Sin datos.</div>
    ) : (
      <div style={adminS.tableWrap}>
        <table style={adminS.table}>
          <thead>
            <tr>
              <th style={adminS.th}>Nombre</th>
              <th style={adminS.th}>Nº Registro</th>
              <th style={adminS.th}>{countLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.nombre}-${r.nregistro || ''}`}>
                <td style={adminS.td}>{r.nombre || '—'}</td>
                <td style={adminS.td}>{r.nregistro || '—'}</td>
                <td style={{ ...adminS.td, fontWeight: 700 }}>{String(r[countKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 1rem' }}>Medicamentos</h1>

      <div style={adminS.grid}>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Guardados</div>
          <div style={{ ...adminS.kpiValue, color: A.blue }}>{t.saved_total.toLocaleString('es-ES')}</div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Favoritos</div>
          <div style={{ ...adminS.kpiValue, color: A.amber }}>{t.favorites_total}</div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Consultas</div>
          <div style={adminS.kpiValue}>{t.consultas_total.toLocaleString('es-ES')}</div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Usuarios con medicamentos</div>
          <div style={adminS.kpiValue}>{t.users_saved}</div>
        </div>
        <div style={adminS.card}>
          <div style={adminS.kpiLabel}>Usuarios con consultas</div>
          <div style={adminS.kpiValue}>{t.users_consulted}</div>
        </div>
      </div>

      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Top guardados</div>
        {renderTable(data.mostSaved, 'saves', 'Guardados')}
      </div>
      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Top favoritos</div>
        {renderTable(data.mostFavorited, 'favorites', 'Favoritos')}
      </div>
      <div style={adminS.section}>
        <div style={adminS.sectionTitle}>Top consultados</div>
        {renderTable(data.mostConsulted, 'consultas', 'Consultas')}
      </div>
    </div>
  )
}
