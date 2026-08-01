import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { countByLetter, getDrugsByLetter, catalogMetadata, PAGE_SIZE } from '@/lib/medicamentos';
import { makeSlug } from '@/lib/slug';

export const revalidate = 3600;

interface Props {
  params: Promise<{ letter: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { letter } = await params;
  const l = letter.toUpperCase();
  if (!/^[a-z]$/i.test(letter)) return { title: 'Página no encontrada' };
  return catalogMetadata(
    `Medicamentos con ${l} — Prospectos y ficha | Nartalis`,
    `Consulta medicamentos que comienzan por ${l} y accede a sus prospectos, principios activos y datos oficiales de la AEMPS en Nartalis.`,
    `https://nartalis.com/medicamentos/${letter}`,
  );
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '1.5rem', lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.35rem', marginBottom: '2rem' },
  drugLink: {
    display: 'block', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#A0AEC0',
    borderRadius: 6, textDecoration: 'none', transition: 'background 0.15s',
  },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', flexWrap: 'wrap' as const, marginTop: '1.5rem' },
  pageLink: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 36, height: 36, borderRadius: 8,
    background: 'rgba(103,72,253,0.08)', color: '#A78BFA',
    fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none',
  },
  pageLinkActive: {
    background: 'rgba(103,72,253,0.25)', color: '#C4B5FD', fontWeight: 700,
  },
  breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: '1.5rem' },
  breadcrumbLink: { color: '#94A3B8', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 0.4rem', color: '#64748B' },
};

function PageNav({ letter, page, totalPages }: { letter: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const maxVisible = 5;
  const pages: (number | '...')[] = [];
  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav style={S.pagination} aria-label="Paginación">
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} style={{ color: '#66748A', fontSize: '0.8rem' }}>…</span>
        ) : (
          <Link
            key={p}
            href={p === 1 ? `/medicamentos/${letter}` : `/medicamentos/${letter}/${p}`}
            style={{ ...S.pageLink, ...(p === page ? S.pageLinkActive : {}) }}
          >
            {p}
          </Link>
        )
      )}
    </nav>
  );
}

export default async function LetterPage({ params }: Props) {
  const { letter } = await params;
  if (!/^[a-z]$/i.test(letter)) notFound();

  const l = letter.toUpperCase();
  const total = await countByLetter(l);
  if (total === 0) notFound();

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const drugs = await getDrugsByLetter(l, 1);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medicamentos' },
      { '@type': 'ListItem', position: 3, name: l },
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
        <Link href="/medicamentos" style={S.breadcrumbLink}>Medicamentos</Link>
        <span style={S.breadcrumbSep}>/</span>
        <span style={{ color: '#64748B' }}>{l}</span>
      </nav>

      <h1 style={S.h1}>Medicamentos con {l}</h1>
      <p style={S.subtitle}>
        {total} medicamento{total !== 1 ? 's' : ''} que comienzan por {l}.
        {totalPages > 1 ? ` Página 1 de ${totalPages}.` : ''} Accede a sus prospectos y datos oficiales de la AEMPS.
      </p>

      <div style={S.grid}>
        {drugs.map(d => (
          <Link
            key={d.nregistro}
            href={`/prospectos/${makeSlug(d.nombre, d.nregistro)}`}
            style={S.drugLink}
            className="md-drug-link"
          >
            {d.nombre}
          </Link>
        ))}
      </div>

      <PageNav letter={letter} page={1} totalPages={totalPages} />

      <style>{`
        .md-drug-link:hover { background: rgba(255,255,255,0.05) !important; color: #EDEDED !important; }
      `}</style>
    </div>
  );
}
