import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getNartalisSession, toPublicUser } from '@/lib/auth'
import AdminLayout from '@/components/admin/AdminLayout'

export const metadata: Metadata = {
  title: 'Administración — Nartalis',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await getNartalisSession()

  // Sin sesión → /login (con next=/admin para volver tras autenticarse)
  if (!user) {
    redirect('/login?next=/admin')
  }

  // Sesión USER → /espacio (sin acceso administrativo)
  if (user.role !== 'ADMIN') {
    redirect('/espacio')
  }

  return <AdminLayout sessionUser={toPublicUser(user)} />
}
