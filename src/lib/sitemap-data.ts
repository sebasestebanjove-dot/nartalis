import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nartalis.com';

const MIN_PA_MEDICINE_COUNT = 5;
const MIN_ATC_MEDICINE_COUNT = 10;
const MIN_PROSPECTO_PA_MEDICINE_COUNT = 20;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function urlsetXml(urls: string[]): string {
  const body = urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function sitemapIndexXml(sitemaps: string[]): string {
  const body = sitemaps.map(url => `  <sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

export function getCoreUrls(): string[] {
  return [
    SITE_URL,
    `${SITE_URL}/medicamentos`,
    `${SITE_URL}/preguntas-frecuentes`,
    `${SITE_URL}/acerca-de`,
    `${SITE_URL}/metodologia`,
  ];
}

export async function getPrincipiosActivosUrls(): Promise<string[]> {
  const rows = await sql`
    SELECT slug
    FROM farma_principles
    WHERE tipo = 'simple'
      AND active = true
      AND medicine_count >= ${MIN_PA_MEDICINE_COUNT}
    ORDER BY medicine_count DESC, slug ASC
  ` as { slug: string }[];

  return [
    `${SITE_URL}/principios-activos`,
    ...rows.map(row => `${SITE_URL}/principios-activos/${row.slug}`),
  ];
}

export async function getIndicacionesUrls(): Promise<string[]> {
  const rows = await sql`
    SELECT slug
    FROM farma_principles
    WHERE tipo = 'simple'
      AND active = true
      AND medicine_count >= ${MIN_PA_MEDICINE_COUNT}
    ORDER BY medicine_count DESC, slug ASC
  ` as { slug: string }[];

  return rows.map(row => `${SITE_URL}/medicamentos/para-que-sirve/${row.slug}`);
}

export async function getAtcUrls(): Promise<string[]> {
  const l3 = await sql`
    SELECT code
    FROM atc_cache
    WHERE level = 3
    GROUP BY code
    HAVING COUNT(DISTINCT nregistro) >= ${MIN_ATC_MEDICINE_COUNT}
    ORDER BY code ASC
  ` as { code: string }[];

  const l4 = await sql`
    SELECT code
    FROM atc_cache
    WHERE level = 4
    GROUP BY code
    HAVING COUNT(DISTINCT nregistro) >= ${MIN_ATC_MEDICINE_COUNT}
    ORDER BY code ASC
  ` as { code: string }[];

  const codes = [...l3.map(row => row.code), ...l4.map(row => row.code)];
  return [`${SITE_URL}/atc`, ...codes.map(code => `${SITE_URL}/atc/${code}`)];
}

export async function getProspectosPrioritariosUrls(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT fc.nombre, fc.nregistro
    FROM farma_name_cache fc
    JOIN pa_cache pc ON pc.nregistro = fc.nregistro AND pc.pa_principle_id IS NOT NULL
    JOIN farma_principles fp ON fp.id = pc.pa_principle_id
    WHERE fp.active = true
      AND fp.tipo = 'simple'
      AND fp.medicine_count >= ${MIN_PROSPECTO_PA_MEDICINE_COUNT}
    ORDER BY fc.nombre ASC
  ` as { nombre: string; nregistro: string }[];

  return rows.map(row => `${SITE_URL}/prospectos/${makeSlug(row.nombre, row.nregistro)}`);
}