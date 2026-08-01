import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';
import { getAllLetters } from '@/lib/medicamentos';

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
    // ── Letter pages ──
    const letters = await getAllLetters();
    const letterPages: MetadataRoute.Sitemap = [];
    for (const l of letters) {
      letterPages.push({
        url: `${SITE_URL}/medicamentos/${l.letter.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });
      // Paginated pages for letters with >200 drugs
      for (let p = 2; p <= l.pages; p++) {
        letterPages.push({
          url: `${SITE_URL}/medicamentos/${l.letter.toLowerCase()}/${p}`,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.6,
        });
      }
    }

    // ── Prospectos (sin el filtro IP* que excluía fármacos reales) ──
    const rows = await sql`
      SELECT nombre, nregistro FROM farma_name_cache
      WHERE updated_at IS NOT NULL
    ` as { nombre: string; nregistro: string }[];

    const drugPages: MetadataRoute.Sitemap = rows.map(row => ({
      url: `${SITE_URL}/prospectos/${makeSlug(row.nombre, row.nregistro)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...letterPages, ...drugPages];
  } catch {
    return staticPages;
  }
}
