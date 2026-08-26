import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getNartalisSession } from '@/lib/auth';
import EspacioDashboard from '@/components/espacio/EspacioDashboard';
import EspacioSaveResolver from '@/components/espacio/EspacioSaveResolver';
import AuthResultTracker from '@/components/auth/AuthResultTracker';
import EspacioCleanUrl from '@/components/auth/EspacioCleanUrl';

export const metadata: Metadata = {
  title: 'Tu espacio personal — Nartalis',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

type EspacioSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function EspacioPage({ searchParams }: { searchParams: EspacioSearchParams }) {
  const user = await getNartalisSession();
  if (!user) {
    redirect('/registro');
  }

  const sp = await searchParams;
  const welcome = sp.welcome === '1';

  return (
    <>
      <EspacioDashboard name={user.name || 'Mi cuenta'} welcome={welcome} role={user.role} plan={user.plan} />
      <Suspense fallback={null}>
        <EspacioSaveResolver />
        <AuthResultTracker result="success" />
      </Suspense>
      <EspacioCleanUrl />
    </>
  );
}
