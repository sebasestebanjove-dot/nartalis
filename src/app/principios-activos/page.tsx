import type { Metadata } from 'next';
import Link from 'next/link';
import { catalogMetadata } from '@/lib/medicamentos';

export const revalidate = 3600;

export const metadata: Metadata = catalogMetadata(
  'Principios activos — Medicamentos y prospectos | Nartalis',
  'Consulta medicamentos por principio activo. Información oficial de la AEMPS (CIMA) sobre principios activos y los medicamentos que los contienen.',
  'https://nartalis.com/principios-activos',
);

const KNOWN_PRINCIPLES = [
  'omeprazol', 'esomeprazol', 'paracetamol', 'ibuprofeno', 'aspirina',
  'atorvastatina', 'simvastatina', 'metformina', 'enalapril', 'losartan',
  'amlodipino', 'levotiroxina', 'pantoprazol', 'tramadol', 'diazepam',
  'lorazepam', 'sertralina', 'fluoxetina', 'citalopram', 'gabapentina',
  'pregabalina', 'tamsulosina', 'finasterida', 'salbutamol', 'budesonida',
  'furosemida', 'hidroclorotiazida', 'bisoprolol', 'carvedilol', 'clopidogrel',
  'acenocumarol', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban',
  'insulina', 'sitagliptina', 'dapagliflozina', 'empagliflozina',
  'ranitidina', 'cetirizina', 'loratadina', 'ebastina', 'dexketoprofeno',
  'naproxeno', 'diclofenaco', 'celecoxib', 'etoricoxib', 'morfina',
  'fentanilo', 'metadona', 'buprenorfina', 'lidocaina', 'ropivacaina',
  'amoxicilina', 'azitromicina', 'ciprofloxacino', 'levofloxacino', 'claritromicina',
  'doxiciclina', 'cotrimoxazol', 'aciclovir', 'valaciclovir', 'fluconazol',
  'itraconazol', 'voriconazol', 'metronidazol', 'albendazol', 'mebendazol',
  'ivermectina', 'hidroxicloroquina', 'cloroquina', 'prednisona', 'prednisolona',
  'metilprednisolona', 'dexametasona', 'hidrocortisona', 'fluticasona',
  'beclometasona', 'mometasona', 'triamcinolona', 'betametasona',
  'colecalciferol', 'calcio', 'hierro', 'acido-folico', 'vitamina-b12',
  'cobalamina', 'tiamina', 'piridoxina', 'acido-ascorbico', 'tocoferol',
  'fitomenadiona', 'retinol', 'biotina', 'zinc', 'magnesio', 'potasio',
];

function groupByLetter(items: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const letter = item.charAt(0).toUpperCase();
    const list = groups.get(letter) || [];
    list.push(item);
    groups.set(letter, list);
  }
  return groups;
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

export default function PrincipiosActivosPage() {
  const groups = groupByLetter(KNOWN_PRINCIPLES);
  const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medicamentos' },
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

      {sorted.map(([letter, names]) => (
        <div key={letter} style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6748FD', borderBottom: '2px solid #6748FD', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>{letter}</div>
          <div style={S.grid}>
            {names.sort().map(name => (
              <Link
                key={name}
                href={`/principios-activos/${name}`}
                style={S.link}
                className="pai-link"
              >
                {name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
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
