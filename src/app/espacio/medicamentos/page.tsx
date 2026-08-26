import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getNartalisSession } from '@/lib/auth';
import MedicamentosView from '@/components/espacio/MedicamentosView';

export const metadata: Metadata = {
  title: 'Mis medicamentos — Nartalis',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function MedicamentosPage() {
  const user = await getNartalisSession();
  if (!user) {
    redirect('/registro');
  }

  return <MedicamentosView />;
}
