'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, Search, Pill, Activity, ArrowLeft } from 'lucide-react'
import type { PublicSessionUser } from '@/lib/auth'
import AdminDashboardView from './AdminDashboardView'
import AdminUsersView from './AdminUsersView'
import AdminSearchesView from './AdminSearchesView'
import AdminMedsView from './AdminMedsView'
import AdminActivityView from './AdminActivityView'

export type AdminTab = 'resumen' | 'usuarios' | 'busquedas' | 'medicamentos' | 'actividad'

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'resumen', label: 'Resumen', icon: <LayoutDashboard size={16} /> },
  { key: 'usuarios', label: 'Usuarios', icon: <Users size={16} /> },
  { key: 'busquedas', label: 'Búsquedas', icon: <Search size={16} /> },
  { key: 'medicamentos', label: 'Medicamentos', icon: <Pill size={16} /> },
  { key: 'actividad', label: 'Actividad', icon: <Activity size={16} /> },
]

const S = {
  wrap: {
    minHeight: '100vh',
    background: '#1C1C1E',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  nav: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '1rem 1rem 0',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  brand: {
    fontSize: 20,
    fontWeight: 800,
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
    marginRight: 'auto',
  },
  brandSub: {
    fontSize: 12,
    color: '#6748FD',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
  },
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
    transition: 'background 0.15s',
  },
  tabs: {
    display: 'flex',
    gap: '0.35rem',
    marginTop: '1rem',
    flexWrap: 'wrap' as const,
    borderBottom: '1px solid #2C2C2E',
    paddingBottom: '0.75rem',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.9rem',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  },
  tabActive: {
    background: 'rgba(103,72,253,0.2)',
    color: '#C4B5FD',
  },
  userBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.3rem 0.7rem',
    borderRadius: 999,
    background: 'rgba(103,72,253,0.18)',
    border: '1px solid rgba(103,72,253,0.45)',
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: 700,
  },
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '1.5rem 1rem 3rem',
  },
}

export default function AdminLayout({ sessionUser }: { sessionUser: PublicSessionUser }) {
  const [tab, setTab] = useState<AdminTab>('resumen')

  return (
    <div style={S.wrap}>
      <nav style={S.nav}>
        <div style={S.navRow}>
          <div>
            <div style={S.brand}>Nartalis</div>
            <span style={S.brandSub}>Administración</span>
          </div>
          <span style={S.userBadge}>{sessionUser.name || sessionUser.email}</span>
          <Link href="/" style={S.backLink}>
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
        </div>
        <div style={S.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <main style={S.main}>
        {tab === 'resumen' && <AdminDashboardView />}
        {tab === 'usuarios' && <AdminUsersView />}
        {tab === 'busquedas' && <AdminSearchesView />}
        {tab === 'medicamentos' && <AdminMedsView />}
        {tab === 'actividad' && <AdminActivityView />}
      </main>
    </div>
  )
}
