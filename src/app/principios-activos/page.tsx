import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { catalogMetadata } from '@/lib/medicamentos';

export const revalidate = 3600;

export const metadata: Metadata = catalogMetadata(
  'Principios activos — Medicamentos y prospectos | Nartalis',
  'Consulta medicamentos por principio activo. Información oficial de la AEMPS (CIMA) sobre principios activos y los medicamentos que los contienen.',
  'https://nartalis.com/principios-activos',
);

interface PrincipioRow {
  slug: string;
  nombre_canonico: string;
  medicine_count: number;
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '2rem', lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.35rem', marginBottom: '2rem' },
  link: {
    display: 'block', padding: '0.45rem 0.75rem', fontSize: '0.85rem', color: '#A78BFA',
    borderRadius: 6, textDecoration: 'none', transition: 'background 0.15s',
  },
  breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: '1.5rem' },
  breadcrumbLink: { color: '#94A3B8', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 0.4rem', color: '#64748B' },
};

export default async function PrincipiosActivosPage() {
  const rows = await sql`
    SELECT slug, nombre_canonico, medicine_count
    FROM farma_principles
    WHERE tipo = 'simple'
      AND active = true
      AND medicine_count >= 3
    ORDER BY medicine_count DESC, nombre_canonico ASC
  ` as PrincipioRow[];

  const groups = new Map<string, PrincipioRow[]>();
  for (const p of rows) {
    const letter = (p.nombre_canonico?.charAt(0) || p.slug.charAt(0)).toUpperCase();
    const list = groups.get(letter) || [];
    list.push(p);
    groups.set(letter, list);
  }
  const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medidamentos' },
      { '@type': 'ListItem', position: 3, name: 'Principios activos' },
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
        <span style={{ color: '#64748B' }}>Principios activos</span>
      </nav>

      <h1 style={S.h1}>Principios activos</h1>
      <p style={S.subtitle}>
        Consulta los medicamentos disponibles en España agrupados por su principio activo.
        Cada página muestra los medicamentos que contienen un principio activo, con enlaces
        a sus prospectos y fichas técnicas basados en datos oficiales de la AEMPS (CIMA).
      </p>

      {sorted.map(([letter, items]) => (
        <div key={letter} style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6748FD', borderBottom: '2px solid #6748FD', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>{letter} <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 400 }}>{items.length}</span></div>
          <div style={S.grid}>
            {items.map(p => (
              <Link
                key={p.slug}
                href={`/principios-activos/${p.slug}`}
                style={S.link}
                className="pai-link"
              >
                {p.nombre_canonico}
              </Link>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        .pai-link:hover { background: rgba(103,72,253,0.12) !important; }
       `}</style>
    </div>
  );
}
