import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Medicamentos — Información y prospectos | Nartalis',
  description: 'Busca medicamentos y consulta información oficial, principios activos, prospectos y datos de la AEMPS en Nartalis.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://nartalis.com/medicamentos' },
  openGraph: {
    title: 'Medicamentos — Información y prospectos | Nartalis',
    description: 'Busca medicamentos y consulta información oficial, principios activos, prospectos y datos de la AEMPS en Nartalis.',
    url: 'https://nartalis.com/medicamentos',
    siteName: 'Nartalis',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medicamentos — Información y prospectos | Nartalis',
    description: 'Busca medicamentos y consulta información oficial, principios activos, prospectos y datos de la AEMPS en Nartalis.',
  },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nartalis.com';

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '2rem', lineHeight: 1.6 },
  count: { fontSize: '0.85rem', color: '#66748A', marginBottom: '1.5rem' },
  letterGroup: { marginBottom: '2rem' },
  letter: {
    fontSize: '1.2rem', fontWeight: 700, color: '#6748FD',
    borderBottom: '2px solid #6748FD', paddingBottom: '0.3rem', marginBottom: '0.75rem',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' },
  link: {
    display: 'block', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#A0AEC0',
    borderRadius: 6, transition: 'all 0.15s ease', textDecoration: 'none',
  },
  letterLink: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 6,
    backgroundColor: 'rgba(103,72,253,0.1)', color: '#6748FD',
    fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none',
    transition: 'background 0.15s ease',
  },
};

interface Drug { nombre: string; nregistro: string }

function groupByLetter(drugs: Drug[]): Map<string, Drug[]> {
  const groups = new Map<string, Drug[]>();
  for (const d of drugs) {
    const letter = (d.nombre.charAt(0) || '#').toUpperCase();
    const list = groups.get(letter) || [];
    list.push(d);
    groups.set(letter, list);
  }
  return groups;
}

export default async function MedicamentosPage() {
  let drugs: Drug[] = [];
  try {
    drugs = await sql`SELECT DISTINCT nombre, nregistro FROM farma_name_cache ORDER BY nombre` as Drug[];
  } catch { /* fallback vacío */ }

  const groups = groupByLetter(drugs);

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Medicamentos</h1>
      <p style={S.subtitle}>
        Listado completo de todos los medicamentos disponibles en Nartalis. Haz clic en
        cualquier nombre para ver su prospecto, dosis, principios activos y datos
        oficiales de la AEMPS.
      </p>
      <p style={S.count}>
        {drugs.length} medicamento{drugs.length !== 1 ? 's' : ''} indexado{drugs.length !== 1 ? 's' : ''}
      </p>

      <style>{`
        .med-index-link:hover { background: rgba(103,72,253,0.25) !important; }
        .med-drug-link:hover { background: rgba(255,255,255,0.05) !important; color: #EDEDED !important; }
      `}</style>

      {/* Índice alfabético */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '2rem' }}>
        {Array.from(groups.keys()).sort().map(letter => (
          <a
            key={letter}
            href={`#letra-${letter}`}
            className="med-index-link"
            style={S.letterLink}
          >
            {letter}
          </a>
        ))}
      </div>

      {Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => (
        <div key={letter} style={S.letterGroup} id={`letra-${letter}`}>
          <div style={S.letter}>{letter}</div>
          <div style={S.grid}>
            {items.map(d => (
              <a
                key={d.nregistro}
                href={`/prospectos/${makeSlug(d.nombre, d.nregistro)}`}
                className="med-drug-link"
                style={S.link}
              >
                {d.nombre}
              </a>
            ))}
          </div>
        </div>
      ))}

      {drugs.length === 0 && (
        <p style={{ color: '#66748A', fontSize: '0.9rem' }}>
          No hay medicamentos disponibles en este momento.
        </p>
      )}
    </div>
  );
}
