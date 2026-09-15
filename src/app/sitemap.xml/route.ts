import { SITE_URL, sitemapIndexXml } from '@/lib/sitemap-data';

export const revalidate = 86400;

export function GET() {
  const xml = sitemapIndexXml([
    `${SITE_URL}/sitemap-core.xml`,
    `${SITE_URL}/sitemap-principios-activos.xml`,
    `${SITE_URL}/sitemap-indicaciones.xml`,
    `${SITE_URL}/sitemap-atc.xml`,
    `${SITE_URL}/sitemap-prospectos-prioritarios.xml`,
  ]);

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}