import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';
import { getAllLetters } from '@/lib/medicamentos';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nartalis.com';

const KNOWN_PRINCIPLES = [
  'omeprazol', 'esomeprazol', 'paracetamol', 'ibuprofeno', 'aspirina',
  'atorvastatina', 'simvastatina', 'metformina', 'enalapril', 'losartan',
  'amlodipino', 'levotiroxina', 'pantoprazol', 'tramadol', 'diazepam',
  'lorazepam', 'sertralina', 'fluoxetina', 'citalopram', 'gabapentina',
  'pregabalina', 'tamsulosina', 'finasterida', 'salbutamol', 'budesonida',
  'furosemida', 'hidroclorotiazida', 'bisoprolol', 'carvedilol', 'clopidogrel',
  'acenocumarol', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban',
  'insulina', 'sitagliptina', 'dapagliflozina', 'empagliflozina',
  'ranitidina', 'cetirizina', 'loratadina', 'ebastina', 'dexketoprofeno',
  'naproxeno', 'diclofenaco', 'celecoxib', 'etoricoxib', 'morfina',
  'fentanilo', 'metadona', 'buprenorfina', 'lidocaina', 'ropivacaina',
  'amoxicilina', 'azitromicina', 'ciprofloxacino', 'levofloxacino', 'claritromicina',
  'doxiciclina', 'cotrimoxazol', 'aciclovir', 'valaciclovir', 'fluconazol',
  'itraconazol', 'voriconazol', 'metronidazol', 'albendazol', 'mebendazol',
  'ivermectina', 'hidroxicloroquina', 'cloroquina', 'prednisona', 'prednisolona',
  'metilprednisolona', 'dexametasona', 'hidrocortisona', 'fluticasona',
  'beclometasona', 'mometasona', 'triamcinolona', 'betametasona',
  'colecalciferol', 'calcio', 'hierro', 'acido-folico', 'vitamina-b12',
  'cobalamina', 'tiamina', 'piridoxina', 'acido-ascorbico', 'tocoferol',
  'fitomenadiona', 'retinol', 'biotina', 'zinc', 'magnesio', 'potasio',
];

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

    // ── Principios activos ──
    const paPages: MetadataRoute.Sitemap = [
      {
        url: `${SITE_URL}/principios-activos`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      ...KNOWN_PRINCIPLES.map(name => ({
        url: `${SITE_URL}/principios-activos/${name}`,
        lastModified: new Date(),
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

    return [...staticPages, ...letterPages, ...drugPages, ...paPages, ...atcPages];
  } catch {
    return staticPages;
  }
}
