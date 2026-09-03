import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';

export const PAGE_SIZE = 200;

export interface DrugRow {
  nombre: string;
  nregistro: string;
}

export interface LetterInfo {
  letter: string;
  count: number;
  pages: number;
}

/** Obtiene todas las letras con al menos 1 medicamento y cuántas páginas necesita. */
export async function getAllLetters(): Promise<LetterInfo[]> {
  const rows = await sql`
    SELECT UPPER(LEFT(nombre, 1)) AS letter, COUNT(*)::int AS count
    FROM farma_name_cache
    GROUP BY 1
    ORDER BY 1
  ` as { letter: string; count: number }[];

  return rows
    .map(r => ({ letter: r.letter, count: r.count, pages: Math.ceil(r.count / PAGE_SIZE) }))
    .filter(l => l.letter >= 'A' && l.letter <= 'Z');
}

/** Cuenta medicamentos que empiezan por una letra. */
export async function countByLetter(letter: string): Promise<number> {
  const [row] = await sql`
    SELECT COUNT(*)::int AS c FROM farma_name_cache WHERE nombre ILIKE ${letter + '%'}
  ` as { c: number }[];
  return row?.c ?? 0;
}

/** Obtiene una página de medicamentos de una letra (orden alfabético). */
export async function getDrugsByLetter(letter: string, page: number): Promise<DrugRow[]> {
  const offset = (page - 1) * PAGE_SIZE;
  return await sql`
    SELECT DISTINCT nombre, nregistro
    FROM farma_name_cache
    WHERE nombre ILIKE ${letter + '%'}
    ORDER BY nombre
    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  ` as DrugRow[];
}

/** Genera metadata base para páginas de catálogo. */
export function catalogMetadata(title: string, description: string, canonical: string) {
  return {
    title,
    description,
    robots: { index: true, follow: true } as const,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Nartalis',
      locale: 'es_ES',
      type: 'website',
      images: [
        {
          url: '/logos/logo_ok_2026.png',
          width: 1254,
          height: 1254,
          alt: 'Nartalis',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
    },
  };
}

/** Helper para el nombre del medicamento. */
export function firstLetter(name: string): string {
  return (name.charAt(0) || '#').toUpperCase();
}
