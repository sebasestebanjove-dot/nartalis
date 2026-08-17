import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';
import { countByLetter } from '@/lib/medicamentos';
import { ingestPrincipleIfPresent } from '@/lib/pa-principle';
import { resolveMedicamentoPaLinks } from '@/lib/pa-resolve';
import { getNartalisSession, toPublicUser } from '@/lib/auth';
import ProspectoView from '@/components/farma/screens/ProspectoView';
import type { Medicamento } from '@/components/farma/types';
import type { PaLink } from '@/components/farma/screens/ProspectoView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nartalis.com';

interface Props {
  params: Promise<{ slug: string }>;
}

const fetchMedicamento = cache(async (nombre: string): Promise<Medicamento | null> => {
  try {
    const res = await fetch(
      `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(nombre.replace(/-/g, ' '))}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.resultados?.length) return null;
    const raw = data.resultados[0];
    return {
      nombre: raw.nombre || '',
      registro: raw.nregistro || '',
      laboratorio: raw.labtitular || '',
      laboratorioComercializador: raw.labcomercializador || '',
      receta: raw.receta || false,
      conduc: raw.conduc || false,
      cpresc: raw.cpresc || '',
      vias: (raw.viasAdministracion || []).map((v: any) => v.nombre),
      imagenUrl: raw.fotos?.[0]?.url || null,
      prospectoUrl: (raw.docs || []).find((d: any) => d.tipo === 2)?.url || null,
      fichaTecnicaUrl: (raw.docs || []).find((d: any) => d.tipo === 1)?.url || null,
      generico: raw.generico || false,
      triangulo: raw.triangulo || false,
      psum: raw.psum || false,
      notas: raw.notas || false,
      biosimilar: raw.biosimilar || false,
      huerfano: raw.huerfano || false,
      ema: raw.ema || false,
      materialesInf: raw.materialesInf || false,
      comerc: raw.comerc ?? true,
      dosis: raw.dosis || null,
      formaFarmaceutica: raw.formaFarmaceuticaSimplificada?.nombre || null,
      pactivos: raw.pactivos || raw.vtm?.nombre || null,
      principiosActivos: (raw.principiosActivos || []).map((p: any) => ({
        nombre: p.nombre || '',
        cantidad: p.cantidad || '',
        unidad: p.unidad || '',
      })),
      excipientes: (raw.excipientes || []).map((e: any) => ({
        nombre: e.nombre || '',
        cantidad: e.cantidad || null,
        unidad: e.unidad || null,
      })),
      atcs: (raw.atcs || []).map((a: any) => ({
        codigo: a.codigo || '',
        nombre: a.nombre || '',
        nivel: a.nivel,
      })),
      presentaciones: (raw.presentaciones || []).map((p: any) => ({
        nombre: p.nombre || '',
        cn: p.cn || '',
        comerc: p.comerc ?? true,
        psum: p.psum || false,
      })),
      estado: raw.estado ? {
        aut: raw.estado.aut ?? null,
        rev: raw.estado.rev ?? null,
      } : undefined,
    };
  } catch {
    return null;
  }
});

const fetchMedicamentoByNregistro = cache(async (nregistro: string): Promise<Medicamento | null> => {
  try {
    const res = await fetch(
      `https://cima.aemps.es/cima/rest/medicamento?nregistro=${encodeURIComponent(nregistro)}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return null;
    const raw = await res.json();
    if (!raw.nombre) return null;
    // Ingesta ATC best-effort (no bloquea el renderizado)
    ingestAtcCache(raw, nregistro).catch(e => console.error('ATC ingest error:', e?.message || e));
    ingestPaCache(raw, nregistro).catch(e => console.error('PA ingest error:', e?.message || e));
    return {
      nombre: raw.nombre || '',
      registro: raw.nregistro || '',
      laboratorio: raw.labtitular || '',
      laboratorioComercializador: raw.labcomercializador || '',
      receta: raw.receta || false,
      conduc: raw.conduc || false,
      cpresc: raw.cpresc || '',
      vias: (raw.viasAdministracion || []).map((v: any) => v.nombre),
      imagenUrl: raw.fotos?.[0]?.url || null,
      prospectoUrl: (raw.docs || []).find((d: any) => d.tipo === 2)?.url || null,
      fichaTecnicaUrl: (raw.docs || []).find((d: any) => d.tipo === 1)?.url || null,
      generico: raw.generico || false,
      triangulo: raw.triangulo || false,
      psum: raw.psum || false,
      notas: raw.notas || false,
      biosimilar: raw.biosimilar || false,
      huerfano: raw.huerfano || false,
      ema: raw.ema || false,
      materialesInf: raw.materialesInf || false,
      comerc: raw.comerc ?? true,
      dosis: raw.dosis || null,
      formaFarmaceutica: raw.formaFarmaceuticaSimplificada?.nombre || null,
      pactivos: raw.pactivos || raw.vtm?.nombre || null,
      principiosActivos: (raw.principiosActivos || []).map((p: any) => ({
        nombre: p.nombre || '',
        cantidad: p.cantidad || '',
        unidad: p.unidad || '',
      })),
      excipientes: (raw.excipientes || []).map((e: any) => ({
        nombre: e.nombre || '',
        cantidad: e.cantidad || null,
        unidad: e.unidad || null,
      })),
      atcs: (raw.atcs || []).map((a: any) => ({
        codigo: a.codigo || '',
        nombre: a.nombre || '',
        nivel: a.nivel,
      })),
      presentaciones: (raw.presentaciones || []).map((p: any) => ({
        nombre: p.nombre || '',
        cn: p.cn || '',
        comerc: p.comerc ?? true,
        psum: p.psum || false,
      })),
      estado: raw.estado ? {
        aut: raw.estado.aut ?? null,
        rev: raw.estado.rev ?? null,
      } : undefined,
    };
  } catch {
    return null;
  }
});

// Persistencia ATC (niveles 3 y 4) — best-effort, fire-and-forget.
// Se ejecuta como efecto secundario de la llamada CIMA individual.
// NUNCA bloquea el renderizado de la ficha.
// Nivel 5 NO se almacena (duplicaría /principios-activos).
async function ingestAtcCache(raw: any, nregistro: string) {
  const atcs = raw.atcs || [];
  const level3s = atcs.filter((a: any) => a.nivel === 3);
  const level4s = atcs.filter((a: any) => a.nivel === 4);

  try {
    for (const a of [...level3s, ...level4s]) {
      const parent = a.nivel === 4
        ? (level3s.find((l3: any) => a.codigo.startsWith(l3.codigo))?.codigo || null)
        : null;
      await sql`
        INSERT INTO atc_cache (code, level, name, parent_code, nregistro)
        VALUES (${a.codigo}, ${a.nivel}, ${a.nombre}, ${parent}, ${nregistro})
        ON CONFLICT (code, nregistro) DO UPDATE SET
          name = EXCLUDED.name,
          parent_code = EXCLUDED.parent_code,
          updated_at = NOW()
      `;
    }
  } catch { /* best-effort: si falla, la ficha sigue funcionando */ }
}

// Persistencia PA — mismo patrón que ATC: fire-and-forget, best-effort.
// FASE 2A.2: además de insertar pa_cache, resuelve/crea la entidad canónica
// en farma_principles y guarda pa_principle_id (vínculo automático).
async function ingestPaCache(raw: any, nregistro: string) {
  const pa = raw.vtm?.nombre || raw.pactivos || null;
  if (!pa) return;
  try {
    await ingestPrincipleIfPresent(pa, nregistro);
  } catch { /* best-effort */ }
}

async function getByRegistro(nregistro: string): Promise<Medicamento | null> {
  return fetchMedicamentoByNregistro(nregistro);
}

function parseSlug(slug: string): { nregistro: string; namePart: string } {
  const parts = slug.split('--');
  const nregistro = parts.length >= 2 ? parts[parts.length - 1] : '';
  const namePart = parts.slice(0, -1).join('-');
  return { nregistro, namePart };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { nregistro, namePart } = parseSlug(slug);

  let m = nregistro ? await getByRegistro(nregistro) : null;
  if (!m && namePart) m = await fetchMedicamento(namePart);
  if (!m) return { title: 'Medicamento no encontrado — Nartalis' };

  const title = `${m.nombre} — Prospecto | Nartalis`;
  const canonical = `${SITE_URL}/prospectos/${makeSlug(m.nombre, m.registro)}`;

  const principio = m.pactivos || m.principiosActivos?.[0]?.nombre || null;

  const descParts: string[] = [];
  descParts.push(`Información de ${m.nombre}`);
  if (principio) descParts.push(`principio activo: ${principio}`);
  if (m.laboratorio) descParts.push(`laboratorio: ${m.laboratorio}`);
  if (m.dosis) descParts.push(`dosis: ${m.dosis}`);
  descParts.push('prospecto oficial y datos basados en fuentes de la AEMPS.');
  const description = descParts.join(', ');

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: 'Nartalis',
      locale: 'es_ES',
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ProspectoPage({ params }: Props) {
  const { slug } = await params;

  const { nregistro, namePart } = parseSlug(slug);

  // Redirect 301 only normalizes the name part. The nregistro keeps its case:
  // CIMA's individual endpoint is case-sensitive (BE318254 works, be318254 → 204).
  const normalized = slug.includes('--') && nregistro
    ? `${namePart.toLowerCase()}--${nregistro}`
    : slug.toLowerCase();
  if (slug !== normalized) {
    permanentRedirect(`/prospectos/${normalized}`);
  }

  let m = nregistro ? await getByRegistro(nregistro) : null;
  if (!m && namePart) m = await fetchMedicamento(namePart);
  if (!m) notFound();

  const canonicalSlug = makeSlug(m.nombre, m.registro);

  // Redirect 301 if slug doesn't match canonical
  if (slug !== canonicalSlug) {
    permanentRedirect(`/prospectos/${canonicalSlug}`);
  }

    const principio = m.pactivos || m.principiosActivos?.[0]?.nombre || null;

    // Canonical cross-links: resolve simple indexable PAs (BLOQUE 5).
    let canonicalPaLinks: PaLink[] = [];
    try {
      canonicalPaLinks = await resolveMedicamentoPaLinks(
        principio || null,
        (m.principiosActivos || []).map((p) => p.nombre)
      );
    } catch { /* best-effort */ }

    // Cross-link queries: related drugs (same PA, same ATC L4). No N+1.
  let relatedPa: { nombre: string; nregistro: string }[] = [];
  let relatedAtc: { nombre: string; nregistro: string }[] = [];
  const atcL4Code = m.atcs?.find(a => a.nivel === 4)?.codigo;
  try {
    if (principio) {
      relatedPa = await sql`
        SELECT DISTINCT fc.nombre, fc.nregistro
        FROM pa_cache pa JOIN farma_name_cache fc ON pa.nregistro = fc.nregistro
        WHERE pa.principio = ${principio.toLowerCase()} AND pa.nregistro != ${m.registro}
        ORDER BY fc.nombre LIMIT 5
      ` as { nombre: string; nregistro: string }[];
    }
    if (atcL4Code) {
      relatedAtc = await sql`
        SELECT DISTINCT fc.nombre, fc.nregistro
        FROM atc_cache atc JOIN farma_name_cache fc ON atc.nregistro = fc.nregistro
        WHERE atc.code = ${atcL4Code} AND atc.nregistro != ${m.registro}
        ORDER BY fc.nombre LIMIT 5
      ` as { nombre: string; nregistro: string }[];
    }
  } catch { /* best-effort */ }

  const session = await getNartalisSession()
  const sessionUser = session ? toPublicUser(session) : null
  let isSaved = false
  let isFavorite = false
  if (sessionUser) {
    try {
      const rows = await sql`
        SELECT is_favorite FROM nartalis_user_medicamentos
        WHERE user_id = ${sessionUser.id} AND nregistro = ${m.registro}
        LIMIT 1
      `
      if (rows.length > 0) {
        isSaved = true
        isFavorite = rows[0].is_favorite ?? false
      }
    } catch { /* best-effort, no bloquea el renderizado */ }
  }

  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: m.nombre,
    description: `Información del medicamento ${m.nombre}. Datos oficiales AEMPS.`,
    url: `${SITE_URL}/prospectos/${canonicalSlug}`,
    manufacturer: m.laboratorio ? { '@type': 'Organization', name: m.laboratorio } : undefined,
    activeIngredient: m.principiosActivos?.length
      ? m.principiosActivos.map(p => p.nombre)
      : (principio ? [principio] : undefined),
    dosageForm: m.formaFarmaceutica || undefined,
    administrationRoute: m.vias.length > 0 ? { '@type': 'DrugRoute', name: m.vias.join(', ') } : undefined,
    prescriptionStatus: m.receta ? 'PrescriptionRequired' : 'OTC',
    legalStatus: m.cpresc || undefined,
    isAvailableGenerically: m.generico || undefined,
    drugClass: m.atcs?.length ? {
      '@type': 'DrugClass',
      name: m.atcs[m.atcs.length - 1].nombre,
      code: {
        '@type': 'MedicalCode',
        codeValue: m.atcs[m.atcs.length - 1].codigo,
        codingSystem: 'ATC',
      },
    } : undefined,
    warning: m.conduc ? 'Puede afectar a la capacidad de conducir' : undefined,
    identifier: m.registro ? { '@type': 'PropertyValue', propertyID: 'AEMPS', value: m.registro } : undefined,
  };
  Object.keys(jsonLd).forEach(k => { if (jsonLd[k] === undefined) delete jsonLd[k]; });

  // Breadcrumb con retorno a la letra indexada del medicamento (redistribuye autoridad).
  // Solo enlaza si la letra tiene al menos un medicamento indexado (evita enlaces a 404).
  const firstChar = m.nombre.charAt(0);
  const letterCandidate = /^[a-zA-Z]$/.test(firstChar) ? firstChar.toUpperCase() : null;
  let letter: string | null = null;
  if (letterCandidate) {
    try {
      const c = await countByLetter(letterCandidate);
      if (c > 0) letter = letterCandidate;
    } catch { /* best-effort: sin letra, breadcrumb de 3 niveles */ }
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: `${SITE_URL}/medicamentos` },
      ...(letter
        ? [{ '@type': 'ListItem', position: 3, name: letter, item: `${SITE_URL}/medicamentos/${letter.toLowerCase()}` }]
        : []),
      { '@type': 'ListItem', position: letter ? 4 : 3, name: m.nombre },
    ],
  };

  // Fecha de revisión CIMA para dateModified (preferir rev, fallback a aut)
  const cimaDate = m.estado?.rev || m.estado?.aut || null;
  const dateModified = cimaDate ? new Date(cimaDate).toISOString() : undefined;

  const webPageLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: m.nombre,
    url: `${SITE_URL}/prospectos/${canonicalSlug}`,
    description: `Información del medicamento ${m.nombre} basada en datos oficiales de la AEMPS (CIMA).`,
    mainEntity: jsonLd,
    ...(dateModified ? { dateModified } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1.5rem 0', width: '100%' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: '#94A3B8', marginBottom: '0.5rem' }}>
          <Link href="/" style={{ color: '#94A3B8', textDecoration: 'none' }}>Inicio</Link>
          <span style={{ margin: '0 0.4rem' }}>/</span>
          <Link href="/medicamentos" style={{ color: '#94A3B8', textDecoration: 'none' }}>Medicamentos</Link>
          {letter ? (<>
            <span style={{ margin: '0 0.4rem' }}>/</span>
            <Link href={`/medicamentos/${letter.toLowerCase()}`} style={{ color: '#94A3B8', textDecoration: 'none' }}>{letter}</Link>
          </>) : null}
          <span style={{ margin: '0 0.4rem' }}>/</span>
          <span style={{ color: '#64748B' }}>{m.nombre}</span>
        </nav>
      </div>
      <ProspectoView medicamento={m} relatedPa={relatedPa} relatedAtc={relatedAtc} canonicalPaLinks={canonicalPaLinks} initialSessionUser={sessionUser} initialIsSaved={isSaved} initialIsFavorite={isFavorite} />
    </>
  );
}
