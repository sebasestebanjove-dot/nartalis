import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { catalogMetadata } from '@/lib/medicamentos';
import { makeSlug } from '@/lib/slug';

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchByPrincipio(q: string): Promise<{ nombre: string; nregistro: string; laboratorio: string; dosis: string | null }[]> {
  try {
    const res = await fetch(
      `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.resultados || []).map((r: any) => ({
      nombre: r.nombre || '',
      nregistro: r.nregistro || '',
      laboratorio: r.labtitular || '',
      dosis: r.dosis || null,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return catalogMetadata(
    `${name} — Medicamentos y prospectos | Nartalis`,
    `Consulta los medicamentos que contienen ${name.toLowerCase()} y accede a sus prospectos e información basada en datos oficiales de CIMA/AEMPS.`,
    `https://nartalis.com/principios-activos/${slug}`,
  );
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '1.5rem', lineHeight: 1.6 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '2rem' },
  drugCard: {
    display: 'flex', flexDirection: 'column' as const, gap: '0.3rem',
    padding: '0.85rem 1rem', borderRadius: 12,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
  },
  drugName: { fontSize: 14, fontWeight: 600, color: '#A78BFA', textDecoration: 'none' },
  drugMeta: { fontSize: 12, color: '#94A3B8' },
  breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: '1.5rem' },
  breadcrumbLink: { color: '#94A3B8', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 0.4rem', color: '#64748B' },
};

export default async function PrincipioActivoPage({ params }: Props) {
  const { slug } = await params;
  const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const drugs = await fetchByPrincipio(name);
  if (drugs.length === 0) notFound();

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medicamentos' },
      { '@type': 'ListItem', position: 3, name: name },
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
        <span style={{ color: '#64748B' }}>{name}</span>
      </nav>

      <h1 style={S.h1}>{name}</h1>
      <p style={S.subtitle}>
        El principio activo <strong style={{ color: '#D1D5DB' }}>{name.toLowerCase()}</strong> está presente
        en <strong style={{ color: '#D1D5DB' }}>{drugs.length}</strong> medicamento{drugs.length !== 1 ? 's' : ''}
        disponible{drugs.length !== 1 ? 's' : ''} en España. Consulta sus prospectos y accede a información
        oficial basada en datos de la AEMPS (CIMA).
      </p>

      <div style={S.grid}>
        {drugs.map(d => (
          <div key={d.nregistro} style={S.drugCard}>
            <Link
              href={`/prospectos/${makeSlug(d.nombre, d.nregistro)}`}
              style={S.drugName}
              className="pa-drug-link"
            >
              {d.nombre}
            </Link>
            <div style={S.drugMeta}>
              {[d.dosis, d.laboratorio].filter(Boolean).join(' · ')}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .pa-drug-link:hover { color: #C4B5FD !important; }
      `}</style>
    </div>
  );
}
