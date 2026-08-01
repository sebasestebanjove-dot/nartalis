import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nartalis.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/medicamentos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/preguntas-frecuentes`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const rows = (await sql`SELECT nombre, nregistro FROM farma_name_cache WHERE updated_at IS NOT NULL AND nregistro !~ 'IP\\d*$'`) as { nombre: string; nregistro: string }[];

    const drugPages: MetadataRoute.Sitemap = rows.map(row => ({
      url: `${SITE_URL}/prospectos/${makeSlug(row.nombre, row.nregistro)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...drugPages];
  } catch {
    return staticPages;
  }
}
