import type { Metadata } from 'next';
import FarmaWrapper from '@/components/farma/FarmaWrapper';
import { getNartalisSession, toPublicUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Nartalis — Información oficial de medicamentos | AEMPS',
  description: 'Consulta información oficial de medicamentos basada en datos de la AEMPS. Busca medicamentos, consulta prospectos y encuentra información clara y fiable en Nartalis.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://nartalis.com/' },
  openGraph: {
    type: 'website',
    siteName: 'Nartalis',
    locale: 'es_ES',
    url: 'https://nartalis.com/',
    title: 'Nartalis — Información oficial de medicamentos | AEMPS',
    description: 'Consulta información oficial de medicamentos basada en datos de la AEMPS. Busca medicamentos, consulta prospectos y encuentra información clara y fiable en Nartalis.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nartalis — Información oficial de medicamentos | AEMPS',
    description: 'Consulta información oficial de medicamentos basada en datos de la AEMPS. Busca medicamentos, consulta prospectos y encuentra información clara y fiable en Nartalis.',
  },
};

export const dynamic = 'force-dynamic';

export default async function FarmaPage() {
  const user = await getNartalisSession();
  const webSiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nartalis',
    url: 'https://nartalis.com/',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://nartalis.com/?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteLd) }}
      />
      <FarmaWrapper initialSessionUser={user ? toPublicUser(user) : null} />
    </>
  );
}
