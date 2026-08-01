import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllLetters, catalogMetadata } from '@/lib/medicamentos';

export const revalidate = 3600;

export const metadata: Metadata = catalogMetadata(
  'Medicamentos — Información y prospectos | Nartalis',
  'Consulta el listado de medicamentos de Nartalis y accede a información oficial, prospectos, principios activos y datos de la AEMPS.',
  'https://nartalis.com/medicamentos',
);

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '1.5rem', lineHeight: 1.6 },
  lettersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.5rem', marginBottom: '2rem' },
  letterLink: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    padding: '0.75rem 0.5rem', borderRadius: 10,
    background: 'rgba(103,72,253,0.08)', border: '1px solid rgba(103,72,253,0.18)',
    color: '#A78BFA', fontWeight: 600, fontSize: '1.1rem', textDecoration: 'none',
    transition: 'background 0.15s',
  },
  letterCount: { fontSize: '0.65rem', color: '#66748A', marginTop: '0.15rem' },
  breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: '1.5rem' },
  breadcrumbLink: { color: '#94A3B8', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 0.4rem', color: '#64748B' },
};

export default async function MedicamentosPage() {
  const letters = await getAllLetters();
  const total = letters.reduce((sum, l) => sum + l.count, 0);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos' },
    ],
  };

  return (
    <div style={S.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav aria-label="Breadcrumb" style={S.breadcrumb}>
        <Link href="/" style={S.breadcrumbLink}>Inicio</Link>
        <span style={S.breadcrumbSep}>/</span>
        <span style={{ color: '#64748B' }}>Medicamentos</span>
      </nav>

      <h1 style={S.h1}>Medicamentos</h1>
      <p style={S.subtitle}>
        Consulta el catálogo completo de medicamentos de Nartalis. Toda la información procede
        de fuentes oficiales de la AEMPS (CIMA). Navega por la letra inicial del medicamento
        para encontrar su ficha con prospecto, principios activos y datos oficiales.
      </p>
      <p style={{ fontSize: '0.85rem', color: '#66748A', marginBottom: '2rem' }}>
        {total} medicamento{total !== 1 ? 's' : ''} indexado{total !== 1 ? 's' : ''} · Fuente: AEMPS/CIMA
      </p>

      <div style={S.lettersGrid}>
        {letters.map(l => (
          <Link
            key={l.letter}
            href={`/medicamentos/${l.letter.toLowerCase()}`}
            style={S.letterLink}
            className="ml-letter-link"
          >
            {l.letter}
            <span style={S.letterCount}>{l.count}</span>
          </Link>
        ))}
      </div>

      <style>{`
        .ml-letter-link:hover { background: rgba(103,72,253,0.2) !important; }
      `}</style>
    </div>
  );
}
