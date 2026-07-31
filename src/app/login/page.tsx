import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getNartalisSession } from '@/lib/auth';
import AuthPage from '@/components/auth/AuthPage';

export const metadata: Metadata = {
  title: 'Inicia sesión — Nartalis',
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getNartalisSession();
  if (user) {
    redirect('/espacio');
  }

  return <AuthPage initialMode="login" />;
}
