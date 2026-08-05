import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';
import { getAllLetters } from '@/lib/medicamentos';
import { listPaSeo, listAtcSeo } from '@/lib/seo-contenido';

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
    {
      url: `${SITE_URL}/acerca-de`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/metodologia`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

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

  // ── Principios activos (fuente: farma_principles) ──
  const paRows = await sql`
    SELECT slug
    FROM farma_principles
    WHERE tipo = 'simple'
      AND active = true
      AND medicine_count >= 3
    ORDER BY slug
  ` as { slug: string }[];

  const paPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/principios-activos`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...paRows.map(r => ({
      url: `${SITE_URL}/principios-activos/${r.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];

  // ── ATC pages ──
  const atcL3 = await sql`SELECT DISTINCT code, COUNT(DISTINCT nregistro)::int AS c FROM atc_cache WHERE level = 3 GROUP BY code HAVING COUNT(DISTINCT nregistro) >= 1 ORDER BY code` as { code: string; c: number }[];
  const atcL4 = await sql`SELECT DISTINCT code, COUNT(DISTINCT nregistro)::int AS c FROM atc_cache WHERE level = 4 GROUP BY code HAVING COUNT(DISTINCT nregistro) >= 5 ORDER BY code` as { code: string; c: number }[];

  const atcPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/atc`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...atcL3.map(r => ({
      url: `${SITE_URL}/atc/${r.code}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...atcL4.map(r => ({
      url: `${SITE_URL}/atc/${r.code}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];

  // ── FASE B: T1 "qué es / para qué sirve" (hasta 250 PA, >=5 medicamentos) ──
  const seoPa = await listPaSeo(250);
  const t1Pages: MetadataRoute.Sitemap = seoPa.map(r => ({
    url: `${SITE_URL}/medicamentos/para-que-sirve/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // ── FASE B: T2 "grupos terapéuticos" ATC nivel 3 (>=20 medicamentos, hasta 120) ──
  const seoAtc = await listAtcSeo(20, 120);
  const t2Pages: MetadataRoute.Sitemap = seoAtc.map(r => ({
    url: `${SITE_URL}/medicamentos/grupos-terapeuticos/${r.code}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...letterPages, ...drugPages, ...paPages, ...atcPages, ...t1Pages, ...t2Pages];
}
