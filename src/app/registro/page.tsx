import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getNartalisSession } from '@/lib/auth';
import AuthPage from '@/components/auth/AuthPage';

export const metadata: Metadata = {
  title: 'Crea tu espacio personal — Nartalis',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function RegistroPage() {
  const user = await getNartalisSession();
  if (user) {
    redirect('/espacio');
  }

  return <AuthPage initialMode="register" />;
}
