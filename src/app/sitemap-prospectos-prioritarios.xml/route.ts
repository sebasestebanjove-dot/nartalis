import { getProspectosPrioritariosUrls, urlsetXml } from '@/lib/sitemap-data';

export const revalidate = 86400;

export async function GET() {
  const urls = await getProspectosPrioritariosUrls();
  const xml = urlsetXml(urls);

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}