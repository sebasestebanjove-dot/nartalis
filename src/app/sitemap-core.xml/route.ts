import { getCoreUrls, urlsetXml } from '@/lib/sitemap-data';

export const revalidate = 86400;

export function GET() {
  const xml = urlsetXml(getCoreUrls());

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}