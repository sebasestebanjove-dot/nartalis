import { permanentRedirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { catalogMetadata } from '@/lib/medicamentos';
import { makeSlug } from '@/lib/slug';
import { resolvePa } from '@/lib/pa-resolve';

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

interface DrugRow {
  nombre: string;
  nregistro: string;
}

// CIMA ?nombre= DEJA DE USARSE para resolver la existencia del PA.
// La lista de medicamentos proviene de pa_cache.pa_principle_id JOIN farma_name_cache.
async function fetchDrugsByPrincipleId(principleId: number): Promise<DrugRow[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT fc.nombre, fc.nregistro
      FROM pa_cache pc
      JOIN farma_name_cache fc ON fc.nregistro = pc.nregistro
      WHERE pc.pa_principle_id = ${principleId}
      ORDER BY fc.nombre
      LIMIT 100
    `;
    return rows as DrugRow[];
  } catch {
    return [];
  }
}

async function fetchAtcByPrincipleId(principleId: number): Promise<{ code: string; level: number; name: string }[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT a.code, a.level, a.name
      FROM atc_cache a
      JOIN pa_cache pc ON pc.nregistro = a.nregistro
      WHERE pc.pa_principle_id = ${principleId}
        AND a.level IN (3, 4)
      ORDER BY a.level, a.code
      LIMIT 10
    `;
    return rows as { code: string; level: number; name: string }[];
  } catch {
    return [];
  }
}

function titleCaseSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { entity, aliasRedirectTo } = await resolvePa(slug);
  if (aliasRedirectTo) {
    // alias: redirige. La canonical es la del destino.
    return catalogMetadata(
      `${titleCaseSlug(aliasRedirectTo)} — Medicamentos y prospectos | Nartalis`,
      `Consulta los medicamentos que contienen ${titleCaseSlug(aliasRedirectTo).toLowerCase()} y accede a sus prospectos e información basada en datos oficiales de CIMA/AEMPS.`,
      `https://nartalis.com/principios-activos/${aliasRedirectTo}`,
    );
  }
  if (!entity) {
    return catalogMetadata(
      'Principio activo no encontrado — Nartalis',
      `Principio activo no encontrado.`,
      `https://nartalis.com/principios-activos/${slug}`,
    );
  }
  return catalogMetadata(
    `${entity.nombre_canonico} — Medicamentos y prospectos | Nartalis`,
    `Consulta los medicamentos que contienen ${entity.nombre_canonico.toLowerCase()} y accede a sus prospectos e información basada en datos oficiales de CIMA/AEMPS.`,
    `https://nartalis.com/principios-activos/${entity.slug}`,
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
  const { entity, aliasRedirectTo, notFound: shouldNotFound } = await resolvePa(slug);

  // BLOQUE 2: alias -> 301 permanente hacia el canonical (manejado por middleware).
  // `permanentRedirect` es el fallback (Next emite 308); el 301 real lo impone middleware.ts.
  if (aliasRedirectTo) permanentRedirect(`/principios-activos/${aliasRedirectTo}`);
  // no entity / inactive => 404 real
  if (shouldNotFound || !entity) notFound();

  const drugs = await fetchDrugsByPrincipleId(entity.id);
  const atcCodes = await fetchAtcByPrincipleId(entity.id);

  if (drugs.length === 0) notFound();

  const displayName = (entity.nombre_canonico || titleCaseSlug(entity.slug));

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medicamentos' },
      { '@type': 'ListItem', position: 3, name: 'Principios activos', item: 'https://nartalis.com/principios-activos' },
      { '@type': 'ListItem', position: 4, name: displayName },
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
        <Link href="/principios-activos" style={S.breadcrumbLink}>Principios activos</Link>
        <span style={S.breadcrumbSep}>/</span>
        <span style={{ color: '#64748B' }}>{displayName}</span>
      </nav>

      <h1 style={S.h1}>{displayName}</h1>
      <p style={S.subtitle}>
        El principio activo <strong style={{ color: '#D1D5DB' }}>{displayName.toLowerCase()}</strong> está presente
        en <strong style={{ color: '#D1D5DB' }}>{drugs.length}</strong> medicamento{drugs.length !== 1 ? 's' : ''}
        disponible{drugs.length !== 1 ? 's' : ''} en España.
        {atcCodes.length > 0 && (() => {
          const g3 = atcCodes.filter((a) => a.level === 3).slice(0, 1);
          return g3.length > 0 ? (
            <> {' Pertenece al grupo ATC '}
              {g3.map((a) => (
                <Link key={a.code} href={`/atc/${a.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>{a.code} — {a.name.toLowerCase()}</Link>
              ))}
            {'. '}
            </>
          ) : null;
        })()} Consulta sus prospectos y accede a información oficial basada en datos de la AEMPS (CIMA).
      </p>

      <div style={S.grid}>
        {drugs.map((d) => (
          <div key={d.nregistro} style={S.drugCard}>
            <Link
              href={`/prospectos/${makeSlug(d.nombre, d.nregistro)}`}
              style={S.drugName}
              className="pa-drug-link"
            >
              {d.nombre}
            </Link>
            <div style={S.drugMeta}>
              N·reg. {d.nregistro}
            </div>
          </div>
        ))}
      </div>

      {atcCodes.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6748FD', borderBottom: '2px solid #6748FD', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>Clasificación ATC</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.35rem' }}>
            {atcCodes.map((a) => (
              <Link key={a.code} href={`/atc/${a.code}`}
                style={{ fontSize: 14, color: '#A78BFA', textDecoration: 'none', padding: '0.3rem 0' }}
                className="pa-drug-link">
                {a.code} — {a.name} {a.level === 3 ? '(grupo)' : '(subgrupo)'}
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
         .pa-drug-link:hover { color: #C4B5FD !important; }
       `}</style>
    </div>
  );
}
