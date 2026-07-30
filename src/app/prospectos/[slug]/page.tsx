import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';
import ProspectoView from '@/components/farma/screens/ProspectoView';
import type { Medicamento } from '@/components/farma/types';

interface Props {
  params: Promise<{ slug: string }>;
}

const fetchMedicamento = cache(async (nombre: string): Promise<Medicamento | null> => {
  try {
    const res = await fetch(
      `https://cima.aemps.es/cima/rest/medicamentos?nombre=${encodeURIComponent(nombre)}`,
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
      pactivos: raw.pactivos || null,
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
      })),
      presentaciones: (raw.presentaciones || []).map((p: any) => ({
        nombre: p.nombre || '',
        cn: p.cn || '',
        comerc: p.comerc ?? true,
        psum: p.psum || false,
      })),
      estado: raw.estado ? {
        aut: raw.estado.fechaAut ?? null,
        rev: raw.estado.fechaRev ?? null,
      } : undefined,
    };
  } catch {
    return null;
  }
});

async function getByRegistro(nregistro: string): Promise<Medicamento | null> {
  try {
    const rows = (await sql`SELECT nombre FROM farma_name_cache WHERE nregistro = ${nregistro}`) as { nombre: string }[];
    if (!rows.length) return null;
    return fetchMedicamento(rows[0].nombre);
  } catch {
    return null;
  }
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

  const title = `${m.nombre}: Prospecto, dosis y usos | Nartalis`;
  const description = `Información completa sobre ${m.nombre}.${m.dosis ? ` Dosis: ${m.dosis}.` : ''}${m.receta ? ' Requiere receta médica.' : ' Venta sin receta.'}${m.vias.length > 0 ? ` Vía: ${m.vias.join(', ')}.` : ''} Datos oficiales AEMPS.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Nartalis',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: m.comerc === false ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ProspectoPage({ params }: Props) {
  const { slug } = await params;

  // Redirect 301 if slug contains uppercase
  if (slug !== slug.toLowerCase()) {
    permanentRedirect(`/prospectos/${slug.toLowerCase()}`);
  }

  const { nregistro, namePart } = parseSlug(slug);

  let m = nregistro ? await getByRegistro(nregistro) : null;
  if (!m && namePart) m = await fetchMedicamento(namePart);
  if (!m) notFound();

  const canonicalSlug = makeSlug(m.nombre, m.registro);

  // Redirect 301 if slug doesn't match canonical
  if (slug !== canonicalSlug) {
    permanentRedirect(`/prospectos/${canonicalSlug}`);
  }

  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: m.nombre,
    description: `Información del medicamento ${m.nombre}. Datos oficiales AEMPS.`,
    url: `https://nartalis.app/prospectos/${canonicalSlug}`,
    manufacturer: m.laboratorio ? { '@type': 'Organization', name: m.laboratorio } : undefined,
    activeIngredient: m.principiosActivos?.map(p => p.nombre) || undefined,
    dosageForm: m.formaFarmaceutica || undefined,
    administrationRoute: m.vias.length > 0 ? { '@type': 'DrugRoute', name: m.vias.join(', ') } : undefined,
    prescriptionStatus: m.receta ? 'PrescriptionRequired' : 'OTC',
    warning: m.conduc ? 'Puede afectar a la capacidad de conducir' : undefined,
    identifier: m.registro ? { '@type': 'PropertyValue', propertyID: 'AEMPS', value: m.registro } : undefined,
  };
  Object.keys(jsonLd).forEach(k => { if (jsonLd[k] === undefined) delete jsonLd[k]; });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProspectoView medicamento={m} />
    </>
  );
}
