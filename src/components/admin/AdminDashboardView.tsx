'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'

interface StatsData {
  usuarios: {
    total: number
    new_24h: number
    new_7d: number
    new_30d: number
    active_24h: number
    active_7d: number
    active_30d: number
    logins_7d: number
    logins_30d: number
    plan_free: number
    plan_premium: number
    role_admin: number
    role_user: number
    status_active: number
    status_disabled: number
  }
  buscador: {
    total: number
    last_24h: number
    last_7d: number
    last_30d: number
    text_count: number
    voice_count: number
    with_results: number
    without_results: number
    authenticated: number
    anonymous: number
  }
  espacio: {
    saved: number
    favorites: number
    consultas: number
    users_with_meds: number
    users_with_consultas: number
  }
}

function Kpi({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={adminS.card}>
      <div style={adminS.kpiLabel}>{label}</div>
      <div style={{ ...adminS.kpiValue, color: color || A.fg }}>{typeof value === 'number' ? value.toLocaleString('es-ES') : value}</div>
      {sub && <div style={adminS.kpiSub}>{sub}</div>}
    </div>
  )
}

export default function AdminDashboardView() {
  const [data, setData] = useState<StatsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) throw new Error('no ok')
        const json = await res.json()
        setData(json.data)
      } catch {
        setError('No se pudieron cargar las estadísticas.')
      }
    })()
  }, [])

  if (error) return <div style={adminS.error}>{error}</div>
  if (!data) return <div style={adminS.empty}>Cargando estadísticas...</div>

  const { usuarios: u, buscador: s, espacio: e } = data

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 1rem' }}>Resumen de negocio</h1>

      <div style={adminS.sectionTitle}>Usuarios</div>
      <div style={adminS.grid}>
        <Kpi label="Usuarios totales" value={u.total} />
        <Kpi label="Nuevos 24h" value={u.new_24h} />
        <Kpi label="Nuevos 7 días" value={u.new_7d} />
        <Kpi label="Nuevos 30 días" value={u.new_30d} />
        <Kpi label="Activos 24h" value={u.active_24h} color={A.green} />
        <Kpi label="Activos 7 días" value={u.active_7d} color={A.green} />
        <Kpi label="Activos 30 días" value={u.active_30d} color={A.green} />
        <Kpi label="Logins 7 días" value={u.logins_7d} />
        <Kpi label="Logins 30 días" value={u.logins_30d} />
        <Kpi label="Plan FREE" value={u.plan_free} sub={`${u.total ? Math.round((u.plan_free / u.total) * 100) : 0}%`} color={A.blue} />
        <Kpi label="Plan PREMIUM" value={u.plan_premium} sub={`${u.total ? Math.round((u.plan_premium / u.total) * 100) : 0}%`} color={A.amber} />
        <Kpi label="ADMIN" value={u.role_admin} color={A.accentText} />
        <Kpi label="USER" value={u.role_user} />
        <Kpi label="ACTIVE" value={u.status_active} color={A.green} />
        <Kpi label="DISABLED" value={u.status_disabled} color={A.red} />
      </div>

      <div style={adminS.sectionTitle}>Buscador</div>
      <div style={adminS.grid}>
        <Kpi label="Búsquedas totales" value={s.total} />
        <Kpi label="Últimas 24h" value={s.last_24h} />
        <Kpi label="Últimos 7 días" value={s.last_7d} />
        <Kpi label="Últimos 30 días" value={s.last_30d} />
        <Kpi label="Texto" value={s.text_count} color={A.blue} />
        <Kpi label="Voz" value={s.voice_count} color={A.green} />
        <Kpi
          label="Voz %"
          value={s.total ? `${((s.voice_count / s.total) * 100).toFixed(1)}%` : '—'}
        />
        <Kpi label="Con resultados" value={s.with_results} color={A.green} />
        <Kpi label="Sin resultados" value={s.without_results} color={A.red} />
        <Kpi
          label="Success %"
          value={s.total ? `${((s.with_results / s.total) * 100).toFixed(1)}%` : '—'}
        />
        <Kpi label="Anónimas" value={s.anonymous} />
        <Kpi label="Autenticadas" value={s.authenticated} />
      </div>

      <div style={adminS.sectionTitle}>Espacio</div>
      <div style={adminS.grid}>
        <Kpi label="Medicamentos guardados" value={e.saved} color={A.blue} />
        <Kpi label="Favoritos" value={e.favorites} color={A.amber} />
        <Kpi label="Consultas" value={e.consultas} />
        <Kpi label="Usuarios con medicamentos" value={e.users_with_meds} />
        <Kpi label="Usuarios con consultas" value={e.users_with_consultas} />
      </div>

      <div style={{ fontSize: 12, color: A.faint, marginTop: '1.5rem' }}>
        Métricas calculadas en tiempo real desde la base de datos. Las búsquedas históricas previas a esta fase no tienen result_count/was_successful (valores por defecto 0/false).
      </div>
    </div>
  )
}
