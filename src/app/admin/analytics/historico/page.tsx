import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getNartalisSession } from '@/lib/auth'
import AdminVisitsHistory from '@/components/admin/AdminVisitsHistory'

export const metadata: Metadata = {
  title: 'Histórico diario — Nartalis',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function AdminVisitsHistoryPage() {
  const user = await getNartalisSession()

  // Sin sesión → /login (con next para volver tras autenticarse)
  if (!user) {
    redirect('/login?next=/admin/analytics/historico')
  }

  // Sesión USER → /espacio (sin acceso administrativo)
  if (user.role !== 'ADMIN') {
    redirect('/espacio')
  }

  return <AdminVisitsHistory />
}