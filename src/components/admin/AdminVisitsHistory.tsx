'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { adminS, A } from './adminStyles'

// Histórico completo de «Evolución diaria» de Analytics (visitas, páginas vistas).
// Reutiliza la misma fuente y lógica que la pestaña Visitas de /admin: consulta
// /api/admin/analytics?section=visits sin daily_limit y muestra todas las filas
// en orden más reciente → más antiguo, con la exclusión admin/test activa.

interface DailyRow {
  day: string
  pageviews: number
  visitors: number
}

const S = {
  wrap: {
    minHeight: '100vh',
    background: '#1C1C1E',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  nav: { maxWidth: 1100, margin: '0 auto', padding: '1rem 1rem 0' },
  navRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' as const },
  brand: { fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginRight: 'auto' },
  brandSub: { fontSize: 12, color: '#6748FD', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px' },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.45rem 0.9rem',
    borderRadius: 10,
    border: '1px solid #3A3A3C',
    background: '#2C2C2E',
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    fontFamily: 'inherit',
  },
  main: { maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 3rem' },
}

export default function AdminVisitsHistory() {
  const [rows, setRows] = useState<DailyRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      setRows(null)
      try {
        const res = await fetch('/api/admin/analytics?section=visits&exclude=1')
        if (!res.ok) throw new Error('no ok')
        const json = await res.json()
        if (!cancelled) setRows((json.data?.daily as DailyRow[] | undefined) ?? [])
      } catch {
        if (!cancelled) setError('No se pudieron cargar las métricas.')
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={S.wrap}>
      <nav style={S.nav}>
        <div style={S.navRow}>
          <div>
            <div style={S.brand}>Nartalis</div>
            <span style={S.brandSub}>Administración</span>
          </div>
          <Link href="/admin?tab=analytics" style={S.backLink}>
            <ArrowLeft size={14} /> Volver a Analytics
          </Link>
        </div>
      </nav>
      <main style={S.main}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 0.25rem' }}>Evolución diaria</h1>
        <p style={{ fontSize: 13, color: A.muted, margin: '0 0 1rem' }}>
          Histórico completo de páginas vistas y visitantes por día (más reciente primero), con la exclusión
          admin/test activa.
        </p>

        {error ? <div style={adminS.error}>{error}</div> : null}
        {!error && rows === null ? <div style={adminS.empty}>Cargando métricas...</div> : null}
        {rows && rows.length ? (
          <div style={adminS.tableWrap}>
            <table style={adminS.table}>
              <thead>
                <tr>
                  {['Día', 'Páginas vistas', 'Visitantes'].map((h) => (
                    <th key={h} style={adminS.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={adminS.td}>{r.day}</td>
                    <td style={adminS.td}>{r.pageviews}</td>
                    <td style={adminS.td}>{r.visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          rows && !rows.length ? <div style={adminS.empty}>Sin datos.</div> : null
        )}
      </main>
    </div>
  )
}