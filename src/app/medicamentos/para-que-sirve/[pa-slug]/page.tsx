import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { makeSlug } from '@/lib/slug';
import { catalogMetadata } from '@/lib/medicamentos';
import { getPaSeoBySlug, getPaDrugs, paHasGeneric, SITE_URL_BASE } from '@/lib/seo-contenido';

export const revalidate = 86400;

interface Props { params: Promise<{ 'pa-slug': string }> }

function paName(p: { nombre_canonico: string }): string {
  return p.nombre_canonico;
}

async function getData(slug: string) {
  const pa = await getPaSeoBySlug(slug);
  if (!pa) return null;
  const [drugs, hasGeneric] = await Promise.all([getPaDrugs(pa.id), paHasGeneric(pa.id)]);
  return { pa, drugs, hasGeneric };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'pa-slug': slug } = await params;
  const data = await getData(slug);
  if (!data) return { title: 'Contenido no disponible — Nartalis' };
  const { pa, hasGeneric } = data;
  const name = paName(pa);
  const canonical = `${SITE_URL_BASE}/medicamentos/para-que-sirve/${pa.slug}`;
  const desc = `Qué es ${name} y para qué sirve. Grupo terapéutico ${pa.atc3Code ? pa.atc3Name?.toLowerCase() + ' (ATC ' + pa.atc3Code + ')' : 'ATC'} y ${pa.medicine_count} medicamentos disponibles. Datos oficiales de la AEMPS (CIMA).${hasGeneric ? ' Incluye versión genérica (EFG).' : ''}`;
  return catalogMetadata(
    `${name}: qué es y para qué sirve | Nartalis`,
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

export default async function ParaQueSirvePage({ params }: Props) {
  const { 'pa-slug': slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();
  const { pa, drugs, hasGeneric } = data;
  const name = paName(pa);
  const canonical = `${SITE_URL_BASE}/medicamentos/para-que-sirve/${pa.slug}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL_BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: `${SITE_URL_BASE}/medicamentos` },
      { '@type': 'ListItem', position: 3, name: 'Para qué sirve', item: `${SITE_URL_BASE}/medicamentos` },
      { '@type': 'ListItem', position: 4, name: name },
    ],
  };

  const medicalLd: { '@context': string; '@type': string; name: string; url: string; description: string; mainEntity: { '@type': string; name: string; code?: { '@type': string; codeValue: string; codingSystem: string } }; about?: { '@type': string; activeIngredient: string } } = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: `${name}: qué es y para qué sirve`,
    url: canonical,
    description: `Información sobre el principio activo ${name} y los medicamentos que lo contienen, basada en datos oficiales de la AEMPS (CIMA).`,
    about: { '@type': 'Drug', activeIngredient: name },
    mainEntity: {
      '@type': 'MedicalEntity',
      name: name,
      ...(pa.atc3Code ? {
        code: { '@type': 'MedicalCode', codeValue: pa.atc3Code, codingSystem: 'ATC' },
      } : {}),
    },
  };
  if (medicalLd.mainEntity.code === undefined) delete medicalLd.mainEntity.code;

  return (
    <div style={S.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalLd) }} />

      <nav aria-label="Breadcrumb" style={S.breadcrumb}>
        <Link href="/" style={S.breadcrumbLink}>Inicio</Link><span style={S.breadcrumbSep}>/</span>
        <Link href="/medicamentos" style={S.breadcrumbLink}>Medicamentos</Link><span style={S.breadcrumbSep}>/</span>
        <span style={{ color: '#64748B' }}>{name}</span>
      </nav>

      <h1 style={S.h1}>{name}: qué es y para qué sirve</h1>

      <p style={S.subtitle}>
        Información sobre el principio activo <strong style={{ color: '#D1D5DB' }}>{name}</strong>,
        elaborada exclusivamente a partir de los datos oficiales de la Agencia Española de Medicamentos
        y Productos Sanitarios (AEMPS) a través de su portal CIMA.
      </p>

      <div style={S.sectionTitle}>¿Qué es {name}?</div>
      <p style={S.p}>
        <strong style={{ color: '#D1D5DB' }}>{name}</strong> es un principio activo que está presente en{' '}
        <strong style={{ color: '#D1D5DB' }}>{pa.medicine_count}</strong> medicamento{pa.medicine_count !== 1 ? 's' : ''}{' '}
        autorizado{pa.medicine_count !== 1 ? 's' : ''} en España.
        {pa.atc3Code && pa.atc3Name ? (
          <> Pertenece al grupo terapéutico{' '}
            <Link href={`/atc/${pa.atc3Code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {pa.atc3Name.toLowerCase()} (código ATC {pa.atc3Code})
            </Link>.</>
        ) : null}
      </p>

      <p style={S.p}>
        La información sobre el uso de un principio activo se determina por los medicamentos autorizados
        que lo contienen. Consulta el prospecto de cada medicamento para conocer su indicación, posología
        y advertencias oficiales.
      </p>

      {hasGeneric && (
        <>
          <div style={{ ...S.sectionTitle, marginTop: '1.5rem' }}>¿Existe versión genérica?</div>
          <p style={S.p}>
            Sí. Entre los medicamentos asociados a <strong style={{ color: '#D1D5DB' }}>{name}</strong> existen
            especialidades farmacéuticas genéricas (EFG) comercializadas en España, según los datos oficiales
            de la AEMPS (CIMA).
          </p>
        </>
      )}

      <div style={S.sectionTitle}>Medicamentos con {name}</div>
      <div style={S.grid}>
        {drugs.map(d => (
          <div key={d.nregistro} style={S.card}>
            <Link href={`/prospectos/${makeSlug(d.nombre, d.nregistro)}`} style={S.cardTitle} className="t1-lnk">{d.nombre}</Link>
            <div style={S.cardMeta}>N.º registro: {d.nregistro}</div>
          </div>
        ))}
      </div>

      <div style={S.sectionTitle}>Más información sobre {name}</div>
      <div style={S.grid}>
        <div style={S.card}>
          <Link href={`/principios-activos/${pa.slug}`} style={S.cardTitle} className="t1-lnk">Ver todos los medicamentos con {name}</Link>
          <div style={S.cardMeta}>Página del principio activo en Nartalis</div>
        </div>
        {pa.atc3Code && (
          <div style={S.card}>
            <Link href={`/atc/${pa.atc3Code}`} style={S.cardTitle} className="t1-lnk">Grupo terapéutico ATC {pa.atc3Code} — {pa.atc3Name?.toLowerCase()}</Link>
            <div style={S.cardMeta}>Clasificación anatómica, terapéutica y química</div>
          </div>
        )}
      </div>

      <div style={S.warning}>
        <strong>Advertencia sanitaria:</strong> la información de esta página tiene carácter informativo y divulgativo,
        basada en datos oficiales de la AEMPS (CIMA). No sustituye el consejo, diagnóstico o tratamiento de un
        profesional sanitario. Ante cualquier duda sobre un medicamento, consulta con tu médico o farmacéutico.
      </div>

      <style>{`.t1-lnk:hover { color: #C4B5FD !important; }`}</style>
    </div>
  );
}
