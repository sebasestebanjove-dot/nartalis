import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { catalogMetadata } from '@/lib/medicamentos';
import { makeSlug } from '@/lib/slug';

export const revalidate = 3600;

interface Props { params: Promise<{ code: string }> }

const PAGE_SIZE = 200;

async function getAtcEntry(code: string) {
  const rows = await sql`SELECT DISTINCT code, level, name FROM atc_cache WHERE code = ${code} LIMIT 1` as { code: string; level: number; name: string }[];
  return rows[0] || null;
}

async function getLevel4Subgroups(parentCode: string) {
  return await sql`SELECT DISTINCT code, name, COUNT(DISTINCT nregistro)::int AS count FROM atc_cache WHERE level = 4 AND parent_code = ${parentCode} GROUP BY code, name ORDER BY code` as { code: string; name: string; count: number }[];
}

async function getDrugsByAtc(code: string, page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  return await sql`
    SELECT DISTINCT atc.nregistro, fc.nombre
    FROM atc_cache atc
    JOIN farma_name_cache fc ON atc.nregistro = fc.nregistro
    WHERE atc.code = ${code}
    ORDER BY fc.nombre
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  ` as { nregistro: string; nombre: string }[];
}

async function countDrugsByAtc(code: string): Promise<number> {
  const [row] = await sql`SELECT COUNT(DISTINCT nregistro)::int AS c FROM atc_cache WHERE code = ${code}` as { c: number }[];
  return row?.c ?? 0;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const upper = code.toUpperCase();
  if (code !== upper) return { title: 'Código ATC no válido' };

  const entry = await getAtcEntry(upper);
  if (!entry) return { title: 'Código ATC no encontrado' };

  return catalogMetadata(
    `${upper} — ${entry.name} | Clasificación ATC | Nartalis`,
    `Código ATC ${upper}: ${entry.name}. Consulta medicamentos, prospectos e información oficial basada en datos de la AEMPS (CIMA) en Nartalis.`,
    `https://nartalis.com/atc/${upper}`,
  );
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '1.5rem', lineHeight: 1.6 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '2rem' },
  card: { display: 'flex', flexDirection: 'column' as const, gap: '0.3rem', padding: '0.85rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#A78BFA', textDecoration: 'none' },
  cardMeta: { fontSize: 12, color: '#94A3B8' },
  breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: '1.5rem' },
  breadcrumbLink: { color: '#94A3B8', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 0.4rem', color: '#64748B' },
};

export default async function AtcCodePage({ params }: Props) {
  const { code } = await params;
  const upper = code.toUpperCase();
  if (code !== upper) notFound();

  const entry = await getAtcEntry(upper);
  if (!entry) notFound();

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medicamentos' },
      { '@type': 'ListItem', position: 3, name: 'Clasificación ATC', item: 'https://nartalis.com/atc' },
      { '@type': 'ListItem', position: 4, name: `${upper} — ${entry.name}` },
    ],
  };

  const drugCount = await countDrugsByAtc(upper);

  if (entry.level === 3) {
    const subgroups = await getLevel4Subgroups(upper);
    return (
      <div style={S.page}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        <nav aria-label="Breadcrumb" style={S.breadcrumb}>
          <Link href="/" style={S.breadcrumbLink}>Inicio</Link><span style={S.breadcrumbSep}>/</span>
          <Link href="/medicamentos" style={S.breadcrumbLink}>Medicamentos</Link><span style={S.breadcrumbSep}>/</span>
          <Link href="/atc" style={S.breadcrumbLink}>Clasificación ATC</Link><span style={S.breadcrumbSep}>/</span>
          <span style={{ color: '#64748B' }}>{upper}</span>
        </nav>
        <h1 style={S.h1}>{upper} — {entry.name}</h1>
        <p style={S.subtitle}>
          Grupo terapéutico ATC nivel 3. Incluye {drugCount} medicamento{drugCount !== 1 ? 's' : ''}
          {subgroups.length > 0 ? ` en ${subgroups.length} subgrupo${subgroups.length !== 1 ? 's' : ''}` : ''}.
          Datos basados en fuentes oficiales de la AEMPS (CIMA).
        </p>

        {subgroups.length > 0 && (
          <>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6748FD', borderBottom: '2px solid #6748FD', paddingBottom: '0.3rem', marginBottom: '0.75rem' }}>Subgrupos</div>
            <div style={S.grid}>
              {subgroups.map(sg => (
                <div key={sg.code} style={S.card}>
                  <Link href={`/atc/${sg.code}`} style={S.cardTitle} className="atc-lnk">{sg.code} — {sg.name}</Link>
                  <div style={S.cardMeta}>{sg.count} medicamento{sg.count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <style>{`.atc-lnk:hover { color: #C4B5FD !important; }`}</style>
      </div>
    );
  }

  // Level 4 — show drugs
  const drugs = await getDrugsByAtc(upper, 1);
  const totalPages = Math.ceil(drugCount / PAGE_SIZE);

  return (
    <div style={S.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <nav aria-label="Breadcrumb" style={S.breadcrumb}>
        <Link href="/" style={S.breadcrumbLink}>Inicio</Link><span style={S.breadcrumbSep}>/</span>
        <Link href="/medicamentos" style={S.breadcrumbLink}>Medicamentos</Link><span style={S.breadcrumbSep}>/</span>
        <Link href="/atc" style={S.breadcrumbLink}>Clasificación ATC</Link><span style={S.breadcrumbSep}>/</span>
        <span style={{ color: '#64748B' }}>{upper}</span>
      </nav>
      <h1 style={S.h1}>{upper} — {entry.name}</h1>
      <p style={S.subtitle}>
        Subgrupo terapéutico ATC nivel 4. {drugCount} medicamento{drugCount !== 1 ? 's' : ''} clasificado{drugCount !== 1 ? 's' : ''} en {upper}.
        Datos basados en fuentes oficiales de la AEMPS (CIMA).
      </p>

      <div style={S.grid}>
        {drugs.map(d => (
          <div key={d.nregistro} style={S.card}>
            <Link href={`/prospectos/${makeSlug(d.nombre, d.nregistro)}`} style={S.cardTitle} className="atc-lnk">{d.nombre}</Link>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <p style={{ fontSize: '0.85rem', color: '#66748A', marginTop: '1.5rem' }}>
          Se muestran los primeros {drugs.length} medicamentos de {drugCount} clasificados en {upper}.
        </p>
      )}

      <style>{`.atc-lnk:hover { color: #C4B5FD !important; }`}</style>
    </div>
  );
}
