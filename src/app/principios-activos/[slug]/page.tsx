import { permanentRedirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { catalogMetadata } from '@/lib/medicamentos';
import { makeSlug } from '@/lib/slug';
import { resolvePa } from '@/lib/pa-resolve';

export const revalidate = 86400;
const PAGE_SIZE = 100;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pagina?: string | string[] }>;
}

interface DrugRow {
  nombre: string;
  nregistro: string;
}

// CIMA ?nombre= DEJA DE USARSE para resolver la existencia del PA.
// La lista de medicamentos proviene de pa_cache.pa_principle_id JOIN farma_name_cache.
async function fetchDrugsByPrincipleId(principleId: number, page: number): Promise<DrugRow[]> {
  const offset = (page - 1) * PAGE_SIZE;
  try {
    const rows = await sql`
      SELECT DISTINCT fc.nombre, fc.nregistro
      FROM pa_cache pc
      JOIN farma_name_cache fc ON fc.nregistro = pc.nregistro
      WHERE pc.pa_principle_id = ${principleId}
      ORDER BY fc.nombre
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `;
    return rows as DrugRow[];
  } catch {
    return [];
  }
}

async function countDrugsByPrincipleId(principleId: number): Promise<number> {
  try {
    const rows = await sql`
      SELECT COUNT(DISTINCT fc.nregistro)::int AS c
      FROM pa_cache pc
      JOIN farma_name_cache fc ON fc.nregistro = pc.nregistro
      WHERE pc.pa_principle_id = ${principleId}
    ` as { c: number }[];
    return rows[0]?.c ?? 0;
  } catch {
    return 0;
  }
}

function parsePageParam(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!/^\d+$/.test(value)) return null;
  const page = Number.parseInt(value, 10);
  return page >= 1 ? page : null;
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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pagina } = await searchParams;
  const requestedPage = parsePageParam(pagina);
  const { entity, aliasRedirectTo } = await resolvePa(slug);
  if (aliasRedirectTo) {
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
  const baseUrl = `https://nartalis.com/principios-activos/${entity.slug}`;
  const canonical = requestedPage && requestedPage > 1 ? `${baseUrl}?pagina=${requestedPage}` : baseUrl;
  return catalogMetadata(
    `${entity.nombre_canonico} — Medicamentos y prospectos | Nartalis`,
    `Consulta los medicamentos que contienen ${entity.nombre_canonico.toLowerCase()} y accede a sus prospectos e información basada en datos oficiales de CIMA/AEMPS.`,
    canonical,
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

export default async function PrincipioActivoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { pagina } = await searchParams;
  const requestedPage = parsePageParam(pagina);
  if (!requestedPage) notFound();

  const { entity, aliasRedirectTo, notFound: shouldNotFound } = await resolvePa(slug);

  if (aliasRedirectTo) permanentRedirect(`/principios-activos/${aliasRedirectTo}`);
  if (shouldNotFound || !entity) notFound();

  const [total, atcCodes] = await Promise.all([
    countDrugsByPrincipleId(entity.id),
    fetchAtcByPrincipleId(entity.id),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (requestedPage > totalPages) notFound();

  const drugs = await fetchDrugsByPrincipleId(entity.id, requestedPage);
  if (drugs.length === 0) notFound();

  const displayName = (entity.nombre_canonico || titleCaseSlug(entity.slug));
  const paMedicineCount = total;

  // Enriquecimiento exclusivo para el prototipo de Atorvastatina (datos existentes, sin rediseño).
  let atorvastatinaDoseSummary: string | null = null;
  let atorvastatinaAtc4: { code: string; name: string } | null = null;
  let atorvastatinaShowLimitNotice = false;
  if (slug === 'atorvastatina') {
    const doseCounts = new Map<string, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const dose = m[1].replace(',', '.') + ' mg';
        doseCounts.set(dose, (doseCounts.get(dose) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([d]) => d)
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      if (top.length > 0) {
        atorvastatinaDoseSummary = top.join(', ').replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) atorvastatinaAtc4 = { code: l4.code, name: l4.name };
    if (paMedicineCount > drugs.length) atorvastatinaShowLimitNotice = true;
  }

  // Enriquecimiento exclusivo para el prototipo de Dabigatrán (datos existentes, sin rediseño).
  let dabigatranDoseSummary: string | null = null;
  let dabigatranAtc4: { code: string; name: string } | null = null;
  if (slug === 'dabigatran') {
    const doseCounts = new Map<string, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const dose = m[1].replace(',', '.') + ' mg';
        doseCounts.set(dose, (doseCounts.get(dose) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([d]) => d)
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      if (top.length > 0) {
        dabigatranDoseSummary = top.join(', ').replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) dabigatranAtc4 = { code: l4.code, name: l4.name };
  }

  // Enriquecimiento exclusivo para el prototipo de Quetiapina (datos existentes, sin rediseño).
  let quetiapinaDoseSummary: string | null = null;
  let quetiapinaAtc4: { code: string; name: string } | null = null;
  let quetiapinaShowLimitNotice = false;
  if (slug === 'quetiapina') {
    const doseCounts = new Map<string, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const dose = m[1].replace(',', '.') + ' mg';
        doseCounts.set(dose, (doseCounts.get(dose) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([d]) => d)
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      if (top.length > 0) {
        quetiapinaDoseSummary = top.join(', ').replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) quetiapinaAtc4 = { code: l4.code, name: l4.name };
    if (paMedicineCount > drugs.length) quetiapinaShowLimitNotice = true;
  }

  // Enriquecimiento exclusivo para el prototipo de Pregabalina (datos existentes, sin rediseño).
  let pregabalinaDoseSummary: string | null = null;
  let pregabalinaAtc4: { code: string; name: string } | null = null;
  let pregabalinaShowLimitNotice = false;
  if (slug === 'pregabalina') {
    const doseCounts = new Map<string, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const dose = m[1].replace(',', '.') + ' mg';
        doseCounts.set(dose, (doseCounts.get(dose) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([d]) => d)
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      if (top.length > 0) {
        pregabalinaDoseSummary = top.join(', ').replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) pregabalinaAtc4 = { code: l4.code, name: l4.name };
    if (paMedicineCount > drugs.length) pregabalinaShowLimitNotice = true;
  }

  // Enriquecimiento exclusivo para el prototipo de Olanzapina (datos existentes, sin rediseño).
  let olanzapinaDoseSummary: string | null = null;
  let olanzapinaAtc4: { code: string; name: string } | null = null;
  let olanzapinaShowLimitNotice = false;
  if (slug === 'olanzapina') {
    const doseCounts = new Map<string, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const dose = m[1].replace(',', '.') + ' mg';
        doseCounts.set(dose, (doseCounts.get(dose) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([d]) => d)
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      if (top.length > 0) {
        olanzapinaDoseSummary = top.join(', ').replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) olanzapinaAtc4 = { code: l4.code, name: l4.name };
    if (paMedicineCount > drugs.length) olanzapinaShowLimitNotice = true;
  }

  // Enriquecimiento exclusivo para el prototipo de Levetiracetam (datos existentes, sin rediseño).
  let levetiracetamDoseSummary: string | null = null;
  let levetiracetamAtc4: { code: string; name: string } | null = null;
  let levetiracetamShowLimitNotice = false;
  if (slug === 'levetiracetam') {
    const doseCounts = new Map<number, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const num = parseFloat(m[1].replace(',', '.'));
        doseCounts.set(num, (doseCounts.get(num) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([n]) => n)
        .sort((a, b) => a - b);
      if (top.length > 0) {
        levetiracetamDoseSummary = top
          .map((n) => (n >= 1000 ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : n.toString()) + ' mg')
          .join(', ')
          .replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) levetiracetamAtc4 = { code: l4.code, name: l4.name };
    if (paMedicineCount > drugs.length) levetiracetamShowLimitNotice = true;
  }

  // Enriquecimiento exclusivo para el prototipo de Tramadol (datos existentes, sin rediseño).
  let tramadolDoseSummary: string | null = null;
  let tramadolAtc4: { code: string; name: string } | null = null;
  if (slug === 'tramadol') {
    const doseCounts = new Map<string, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const dose = m[1].replace(',', '.') + ' mg';
        doseCounts.set(dose, (doseCounts.get(dose) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([d]) => d)
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      if (top.length > 0) {
        tramadolDoseSummary = top.join(', ').replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) tramadolAtc4 = { code: l4.code, name: l4.name };
  }

  // Enriquecimiento exclusivo para el prototipo de Topiramato (datos existentes, sin rediseño).
  let topiramatoDoseSummary: string | null = null;
  let topiramatoAtc4: { code: string; name: string } | null = null;
  if (slug === 'topiramato') {
    const doseCounts = new Map<string, number>();
    let classified = 0;
    for (const d of drugs) {
      const m = d.nombre.match(/(\d+(?:[.,]\d+)?)\s*mg/i);
      if (m) {
        const dose = m[1].replace(',', '.') + ' mg';
        doseCounts.set(dose, (doseCounts.get(dose) || 0) + 1);
        classified++;
      }
    }
    if (classified === drugs.length && doseCounts.size > 0) {
      const top = [...doseCounts.entries()]
        .filter(([, c]) => c >= 5)
        .map(([d]) => d)
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      if (top.length > 0) {
        topiramatoDoseSummary = top.join(', ').replace(/, ([^,]*)$/, ' y $1');
      }
    }
    const l4 = atcCodes.find((a) => a.level === 4);
    if (l4) topiramatoAtc4 = { code: l4.code, name: l4.name };
  }

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
        en <strong style={{ color: '#D1D5DB' }}>{paMedicineCount}</strong> medicamentos disponibles en España.
        {totalPages > 1 && <> Página {requestedPage} de {totalPages}.</>}
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
        })()}
        {slug === 'dabigatran' && dabigatranDoseSummary && (
          <> Las dosis más frecuentes son <strong style={{ color: '#D1D5DB' }}>{dabigatranDoseSummary}</strong>.</>
        )}
        {slug === 'dabigatran' && dabigatranAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${dabigatranAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {dabigatranAtc4.code} — {dabigatranAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {slug === 'atorvastatina' && atorvastatinaDoseSummary && (
          <> Las dosis disponibles son <strong style={{ color: '#D1D5DB' }}>{atorvastatinaDoseSummary}</strong>.</>
        )}
        {slug === 'atorvastatina' && atorvastatinaAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${atorvastatinaAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {atorvastatinaAtc4.code} — {atorvastatinaAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {slug === 'atorvastatina' && atorvastatinaShowLimitNotice && (
          <> Se muestran {drugs.length} medicamentos en esta página.</>
        )}
        {slug === 'quetiapina' && quetiapinaDoseSummary && (
          <> Las dosis disponibles son <strong style={{ color: '#D1D5DB' }}>{quetiapinaDoseSummary}</strong>.</>
        )}
        {slug === 'quetiapina' && quetiapinaAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${quetiapinaAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {quetiapinaAtc4.code} — {quetiapinaAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {slug === 'quetiapina' && quetiapinaShowLimitNotice && (
          <> Se muestran {drugs.length} medicamentos en esta página.</>
        )}
        {slug === 'pregabalina' && pregabalinaDoseSummary && (
          <> Las dosis disponibles son <strong style={{ color: '#D1D5DB' }}>{pregabalinaDoseSummary}</strong>.</>
        )}
        {slug === 'pregabalina' && pregabalinaAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${pregabalinaAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {pregabalinaAtc4.code} — {pregabalinaAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {slug === 'pregabalina' && pregabalinaShowLimitNotice && (
          <> Se muestran {drugs.length} medicamentos en esta página.</>
        )}
        {slug === 'olanzapina' && olanzapinaDoseSummary && (
          <> Las dosis disponibles son <strong style={{ color: '#D1D5DB' }}>{olanzapinaDoseSummary}</strong>.</>
        )}
        {slug === 'olanzapina' && olanzapinaAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${olanzapinaAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {olanzapinaAtc4.code} — {olanzapinaAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {slug === 'olanzapina' && olanzapinaShowLimitNotice && (
          <> Se muestran {drugs.length} medicamentos en esta página.</>
        )}
        {slug === 'levetiracetam' && levetiracetamDoseSummary && (
          <> Las dosis disponibles son <strong style={{ color: '#D1D5DB' }}>{levetiracetamDoseSummary}</strong>.</>
        )}
        {slug === 'levetiracetam' && levetiracetamAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${levetiracetamAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {levetiracetamAtc4.code} — {levetiracetamAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {slug === 'levetiracetam' && levetiracetamShowLimitNotice && (
          <> Se muestran {drugs.length} medicamentos en esta página.</>
        )}
        {slug === 'tramadol' && tramadolDoseSummary && (
          <> Las dosis más frecuentes son <strong style={{ color: '#D1D5DB' }}>{tramadolDoseSummary}</strong>.</>
        )}
        {slug === 'tramadol' && tramadolAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${tramadolAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {tramadolAtc4.code} — {tramadolAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {slug === 'topiramato' && topiramatoDoseSummary && (
          <> Las dosis más frecuentes son <strong style={{ color: '#D1D5DB' }}>{topiramatoDoseSummary}</strong>.</>
        )}
        {slug === 'topiramato' && topiramatoAtc4 && (
          <> Pertenece al subgrupo ATC{' '}
            <Link href={`/atc/${topiramatoAtc4.code}`} style={{ color: '#A78BFA', textDecoration: 'none' }}>
              {topiramatoAtc4.code} — {topiramatoAtc4.name.toLowerCase()}
            </Link>.
          </>
        )}
        {' '}Consulta sus prospectos y accede a información oficial basada en datos de la AEMPS (CIMA).
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

      {totalPages > 1 && (
        <nav aria-label="Paginación" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const href = p === 1 ? `/principios-activos/${entity.slug}` : `/principios-activos/${entity.slug}?pagina=${p}`;
            const active = p === requestedPage;
            return (
              <Link
                key={p}
                href={href}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: 8,
                  fontSize: 13,
                  textDecoration: 'none',
                  color: active ? '#EDEDED' : '#A78BFA',
                  background: active ? 'rgba(103,72,253,0.35)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(103,72,253,0.7)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {p}
              </Link>
            );
          })}
        </nav>
      )}

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
