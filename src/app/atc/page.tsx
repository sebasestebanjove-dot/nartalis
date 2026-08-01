import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { catalogMetadata } from '@/lib/medicamentos';

export const revalidate = 3600;

export const metadata: Metadata = catalogMetadata(
  'Clasificación ATC de medicamentos — Grupos terapéuticos | Nartalis',
  'Clasificación ATC de medicamentos. Consulta los grupos terapéuticos oficiales y accede a prospectos e información basada en datos de la AEMPS (CIMA).',
  'https://nartalis.com/atc',
);

interface AtcGroup { code: string; name: string; count: number }

async function getLevel3Groups(): Promise<AtcGroup[]> {
  const rows = await sql`
    SELECT code, name, COUNT(DISTINCT nregistro)::int AS count
    FROM atc_cache WHERE level = 3
    GROUP BY code, name ORDER BY code
  ` as AtcGroup[];
  return rows;
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '2rem', lineHeight: 1.6 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: '0.6rem', marginBottom: '2rem' },
  card: { display: 'flex', flexDirection: 'column' as const, gap: '0.3rem', padding: '0.85rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#A78BFA', textDecoration: 'none' },
  cardMeta: { fontSize: 12, color: '#94A3B8' },
  breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: '1.5rem' },
  breadcrumbLink: { color: '#94A3B8', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 0.4rem', color: '#64748B' },
};

export default async function AtcIndexPage() {
  const groups = await getLevel3Groups();

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medicamentos' },
      { '@type': 'ListItem', position: 3, name: 'Clasificación ATC' },
    ],
  };

  return (
    <div style={S.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <nav aria-label="Breadcrumb" style={S.breadcrumb}>
        <Link href="/" style={S.breadcrumbLink}>Inicio</Link><span style={S.breadcrumbSep}>/</span>
        <Link href="/medicamentos" style={S.breadcrumbLink}>Medicamentos</Link><span style={S.breadcrumbSep}>/</span>
        <span style={{ color: '#64748B' }}>Clasificación ATC</span>
      </nav>

      <h1 style={S.h1}>Clasificación ATC de medicamentos</h1>
      <p style={S.subtitle}>
        La clasificación ATC (Anatomical Therapeutic Chemical) organiza los medicamentos en grupos según el
        órgano o sistema en el que actúan y sus propiedades terapéuticas. Selecciona un grupo para ver
        los medicamentos disponibles en Nartalis con datos oficiales de la AEMPS (CIMA).
      </p>

      <div style={S.grid}>
        {groups.map(g => (
          <div key={g.code} style={S.card}>
            <Link href={`/atc/${g.code}`} style={S.cardTitle} className="atc-idx-link">{g.code} — {g.name}</Link>
            <div style={S.cardMeta}>{g.count} medicamento{g.count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      <style>{`.atc-idx-link:hover { color: #C4B5FD !important; }`}</style>
    </div>
  );
}
