import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getNartalisSession } from '@/lib/auth';
import { styles } from '@/components/auth/styles';
import LogoutButton from '@/components/auth/LogoutButton';
import AuthResultTracker from '@/components/auth/AuthResultTracker';
import EspacioCleanUrl from '@/components/auth/EspacioCleanUrl';

export const metadata: Metadata = {
  title: 'Tu espacio personal — Nartalis',
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
  const displayName = user.name || 'Mi cuenta';

  return (
    <div style={styles.spaceWrap}>
      <div style={styles.spaceCard}>
        <div style={styles.spaceIcon}>
          <span style={styles.spaceCheck}>✓</span>
        </div>
        <h1 style={styles.spaceTitle}>
          {welcome ? 'Tu espacio personal está listo' : `Hola, ${displayName}`}
        </h1>
        <p style={styles.spaceText}>
          {welcome ? 'Hemos creado tu cuenta Nartalis.' : 'Este es tu espacio personal Nartalis.'}
        </p>
        <span style={styles.spaceBadge}>Plan Free</span>
        <p style={styles.spaceText}>Tu espacio personal se está preparando.</p>
        <div style={styles.spaceActions}>
          <Link href="/" style={{ ...styles.spaceBtn, ...styles.spaceBtnPrimary, textDecoration: 'none' }}>
            Volver al inicio
          </Link>
          <LogoutButton style={{ ...styles.spaceBtn, ...styles.spaceBtnGhost, textDecoration: 'none' }} />
        </div>
      </div>
      <EspacioCleanUrl />
      <Suspense fallback={null}>
        <AuthResultTracker result="success" />
      </Suspense>
    </div>
  );
}
