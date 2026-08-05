import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { makeSlug } from '@/lib/slug';
import { catalogMetadata } from '@/lib/medicamentos';
import {
  getAtcSeoByCode, getAtcSubgroups, getAtcPrinciples, getAtcDrugs, SITE_URL_BASE,
} from '@/lib/seo-contenido';

export const revalidate = 86400;

interface Props { params: Promise<{ 'atc-code': string }> }

async function getData(code: string) {
  const upper = code.toUpperCase();
  const group = await getAtcSeoByCode(upper);
  if (!group) return null;
  const [subgroups, principles, drugs] = await Promise.all([
    getAtcSubgroups(upper),
    getAtcPrinciples(upper),
    getAtcDrugs(upper),
  ]);
  return { group, subgroups, principles, drugs };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'atc-code': code } = await params;
  const upper = code.toUpperCase();
  const data = await getData(upper);
  if (!data) return { title: 'Contenido no disponible — Nartalis' };
  const { group, principles } = data;
  const canonical = `${SITE_URL_BASE}/medicamentos/grupos-terapeuticos/${group.code}`;
  const desc = `Medicamentos del grupo terapéutico ${group.name.toLowerCase()} (ATC ${group.code}): ${group.medicine_count} medicamentos y ${principles.length} principios activos disponibles en España. Datos oficiales de la AEMPS (CIMA).`;
  return catalogMetadata(
    `Medicamentos del grupo terapéutico ${group.name} | Nartalis`,
    desc,
    canonical,
  );
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  subtitle: { fontSize: '0.9rem', color: '#A0AEC0', marginBottom: '1.5rem', lineHeight: 1.6 },
  sectionTitle: { fontSize: '1.15rem', fontWeight: 700, color: '#6748FD', borderBottom: '2px solid #6748FD', paddingBottom: '0.3rem', marginBottom: '0.75rem' },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '2rem' },
  card: { display: 'flex', flexDirection: 'column' as const, gap: '0.3rem', padding: '0.85rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#A78BFA', textDecoration: 'none' },
  cardMeta: { fontSize: 12, color: '#94A3B8' },
  breadcrumb: { fontSize: 13, color: '#94A3B8', marginBottom: '1.5rem' },
  breadcrumbLink: { color: '#94A3B8', textDecoration: 'none' },
  breadcrumbSep: { margin: '0 0.4rem', color: '#64748B' },
  warning: {
    fontSize: '0.82rem', lineHeight: 1.6, color: '#A0AEC0', marginTop: '2rem', padding: '1rem 1.1rem',
    borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
  },
  p: { fontSize: '0.9rem', lineHeight: 1.7, color: '#A0AEC0', marginBottom: '0.6rem' },
};

export default async function GrupoTerapeuticoPage({ params }: Props) {
  const { 'atc-code': code } = await params;
  const upper = code.toUpperCase();
  const data = await getData(upper);
  if (!data) notFound();
  const { group, subgroups, principles, drugs } = data;
  const canonical = `${SITE_URL_BASE}/medicamentos/grupos-terapeuticos/${group.code}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL_BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: `${SITE_URL_BASE}/medicamentos` },
      { '@type': 'ListItem', position: 3, name: 'Grupos terapéuticos', item: `${SITE_URL_BASE}/medicamentos` },
      { '@type': 'ListItem', position: 4, name: group.name },
    ],
  };

  const medicalLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: `Medicamentos del grupo terapéutico ${group.name}`,
    url: canonical,
    description: `Medicamentos del grupo terapéutico ${group.name.toLowerCase()} (ATC ${group.code}), basado en datos oficiales de la AEMPS (CIMA).`,
    mainEntity: {
      '@type': 'MedicalEntity',
      name: group.name,
      code: { '@type': 'MedicalCode', codeValue: group.code, codingSystem: 'ATC' },
    },
  };

  return (
    <div style={S.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalLd) }} />

      <nav aria-label="Breadcrumb" style={S.breadcrumb}>
        <Link href="/" style={S.breadcrumbLink}>Inicio</Link><span style={S.breadcrumbSep}>/</span>
        <Link href="/medicamentos" style={S.breadcrumbLink}>Medicamentos</Link><span style={S.breadcrumbSep}>/</span>
        <span style={{ color: '#64748B' }}>Grupo terapéutico {group.name}</span>
      </nav>

      <h1 style={S.h1}>Medicamentos del grupo terapéutico {group.name}</h1>

      <p style={S.subtitle}>
        El grupo terapéutico <strong style={{ color: '#D1D5DB' }}>{group.name}</strong> (código ATC{' '}
        <strong style={{ color: '#D1D5DB' }}>{group.code}</strong>) incluye{' '}
        <strong style={{ color: '#D1D5DB' }}>{group.medicine_count}</strong> medicamento{group.medicine_count !== 1 ? 's' : ''}{' '}
        y <strong style={{ color: '#D1D5DB' }}>{group.principle_count}</strong> principio{group.principle_count !== 1 ? 's' : ''} activo{group.principle_count !== 1 ? 's' : ''}{' '}
        disponible{group.principle_count !== 1 ? 's' : ''} en España, según datos oficiales de la AEMPS (CIMA).
      </p>

      <p style={S.p}>
        La clasificación ATC (Anatomical Therapeutic Chemical) organiza los medicamentos según el sistema u
        órgano sobre el que actúan y sus propiedades terapéuticas. Esta página reúne los principios activos,
        medicamentos y subgrupos de este grupo terapéutico para facilitar su consulta.
      </p>

      <div style={S.sectionTitle}>Subgrupos terapéuticos (ATC nivel 4)</div>
      <div style={S.grid}>
        {subgroups.map(sg => (
          <div key={sg.code} style={S.card}>
            <Link href={`/atc/${sg.code}`} style={S.cardTitle} className="t2-lnk">{sg.code} — {sg.name}</Link>
            <div style={S.cardMeta}>{sg.count} medicamento{sg.count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {principles.length > 0 && (
        <>
          <div style={S.sectionTitle}>Principios activos del grupo</div>
          <div style={S.grid}>
            {principles.map(p => (
              <div key={p.slug} style={S.card}>
                <Link href={`/medicamentos/para-que-sirve/${p.slug}`} style={S.cardTitle} className="t2-lnk">{p.nombre_canonico}</Link>
                <div style={S.cardMeta}>{p.medicine_count} medicamento{p.medicine_count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={S.sectionTitle}>Medicamentos del grupo</div>
      <div style={S.grid}>
        {drugs.map(d => (
          <div key={d.nregistro} style={S.card}>
            <Link href={`/prospectos/${makeSlug(d.nombre, d.nregistro)}`} style={S.cardTitle} className="t2-lnk">{d.nombre}</Link>
            <div style={S.cardMeta}>N.º registro: {d.nregistro}</div>
          </div>
        ))}
      </div>

      <div style={S.sectionTitle}>Clasificación técnica ATC</div>
      <div style={S.grid}>
        <div style={S.card}>
          <Link href={`/atc/${group.code}`} style={S.cardTitle} className="t2-lnk">Ver la ficha técnica ATC {group.code}</Link>
          <div style={S.cardMeta}>Clasificación oficial del grupo terapéutico</div>
        </div>
      </div>

      <div style={S.warning}>
        <strong>Advertencia sanitaria:</strong> la información de esta página tiene carácter informativo y divulgativo,
        basada en datos oficiales de la AEMPS (CIMA). No sustituye el consejo, diagnóstico o tratamiento de un
        profesional sanitario. Ante cualquier duda sobre un medicamento, consulta con tu médico o farmacéutico.
      </div>

      <style>{`.t2-lnk:hover { color: #C4B5FD !important; }`}</style>
    </div>
  );
}
