import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://nartalis.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  try {
    const rows = (await sql`SELECT nombre, nregistro FROM farma_name_cache WHERE updated_at IS NOT NULL`) as { nombre: string; nregistro: string }[];

    const drugPages: MetadataRoute.Sitemap = rows.map(row => ({
      url: `https://nartalis.app/prospectos/${makeSlug(row.nombre, row.nregistro)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...drugPages];
  } catch {
    return staticPages;
  }
}
