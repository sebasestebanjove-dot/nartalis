'use client'

import { useState, useEffect } from 'react'
import { adminS, A } from './adminStyles'
import AdminUserDetail from './AdminUserDetail'

interface AdminUser {
  id: string
  name: string
  email: string
  primary_provider: string
  plan: string
  role: string
  status: string
  created_at: string
  last_login_at: string
  medication_count: number
  consultation_count: number
}

function formatFecha(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function AdminUsersView() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')
  const [provider, setProvider] = useState('')
  const [page, setPage] = useState(0)
  const [limit] = useState(25)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) })
    if (q) params.set('q', q)
    if (plan) params.set('plan', plan)
    if (status) params.set('status', status)
    if (provider) params.set('provider', provider)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/users?${params.toString()}`)
        if (!res.ok) throw new Error('no ok')
        const json = await res.json()
        setUsers(json.data)
        setTotal(json.total)
        setError('')
      } catch {
        setError('No se pudieron cargar los usuarios.')
      }
    })()
  }, [q, plan, status, provider, page, limit, reloadKey])

  const handlePatch = async (id: string, body: Record<string, string>) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setReloadKey((k) => k + 1)
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'No se pudo actualizar el usuario.')
      }
    } catch {
      setError('No se pudo actualizar el usuario.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (detailId) {
    return <AdminUserDetail userId={detailId} onBack={() => setDetailId(null)} />
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 1rem' }}>Usuarios</h1>

      <div style={adminS.toolbar}>
        <input
          style={{ ...adminS.input, maxWidth: 260 }}
          placeholder="Buscar nombre o email..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0) }}
        />
        <select style={adminS.select} value={plan} onChange={(e) => { setPlan(e.target.value); setPage(0) }}>
          <option value="">Plan: todos</option>
          <option value="FREE">FREE</option>
          <option value="PREMIUM">PREMIUM</option>
        </select>
        <select style={adminS.select} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
          <option value="">Estado: todos</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISABLED">DISABLED</option>
        </select>
        <select style={adminS.select} value={provider} onChange={(e) => { setProvider(e.target.value); setPage(0) }}>
          <option value="">Proveedor: todos</option>
          <option value="email">email</option>
          <option value="google">google</option>
          <option value="apple">apple</option>
        </select>
        <button style={adminS.btn} onClick={() => setReloadKey((k) => k + 1)}>Actualizar</button>
        <span style={{ fontSize: 12, color: A.faint }}>{total} usuarios</span>
      </div>

      {error && <div style={adminS.error}>{error}</div>}

      {users === null ? (
        <div style={adminS.empty}>Cargando usuarios...</div>
      ) : users.length === 0 ? (
        <div style={adminS.empty}>Sin resultados para los filtros actuales.</div>
      ) : (
        <>
          <div style={adminS.tableWrap}>
            <table style={adminS.table}>
              <thead>
                <tr>
                  <th style={adminS.th}>Nombre</th>
                  <th style={adminS.th}>Email</th>
                  <th style={adminS.th}>Proveedor</th>
                  <th style={adminS.th}>Plan</th>
                  <th style={adminS.th}>Rol</th>
                  <th style={adminS.th}>Estado</th>
                  <th style={adminS.th}>Registro</th>
                  <th style={adminS.th}>Último login</th>
                  <th style={adminS.th}>Med.</th>
                  <th style={adminS.th}>Cons.</th>
                  <th style={adminS.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={adminS.td}>{u.name || '—'}</td>
                    <td style={adminS.td}>
                      <button
                        onClick={() => setDetailId(u.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: A.accentText,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        {u.email}
                      </button>
                    </td>
                    <td style={adminS.td}>
                      <span style={{ ...adminS.badge, ...(u.primary_provider === 'google' ? adminS.badgeBlue : u.primary_provider === 'apple' ? adminS.badgeGray : adminS.badgePurple) }}>
                        {u.primary_provider}
                      </span>
                    </td>
                    <td style={adminS.td}>
                      <select
                        style={adminS.select}
                        value={u.plan}
                        onChange={(e) => handlePatch(u.id, { plan: e.target.value })}
                      >
                        <option value="FREE">FREE</option>
                        <option value="PREMIUM">PREMIUM</option>
                      </select>
                    </td>
                    <td style={adminS.td}>
                      <span style={{ ...adminS.badge, ...(u.role === 'ADMIN' ? adminS.badgePurple : adminS.badgeGray) }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={adminS.td}>
                      <select
                        style={adminS.select}
                        value={u.status}
                        onChange={(e) => handlePatch(u.id, { status: e.target.value })}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DISABLED">DISABLED</option>
                      </select>
                    </td>
                    <td style={adminS.td}>{formatFecha(u.created_at)}</td>
                    <td style={adminS.td}>{formatFecha(u.last_login_at)}</td>
                    <td style={adminS.td}>{u.medication_count}</td>
                    <td style={adminS.td}>{u.consultation_count}</td>
                    <td style={adminS.td}>
                      <span style={{ fontSize: 11, color: A.faint }}>{u.id.slice(0, 8)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
            <button style={adminS.btnGhost} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: A.muted }}>Página {page + 1} de {totalPages}</span>
            <button style={adminS.btnGhost} disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
