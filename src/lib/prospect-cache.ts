// NARTALIS — CACHE P0 DE FICHAS /prospectos/[slug]
// Previous Model (sin `cacheComponents`): unstable_cache es la API compatible.
// Cada wrapper incluye sus argumentos (nregistro/principio/atcL4/letra) en la clave
// de cache → aislamiento por medicamento, sin contaminación entre fichas.
import { unstable_cache } from 'next/cache';
import { sql } from '@/lib/db';
import { countByLetter } from '@/lib/medicamentos';
import { resolveMedicamentoPaLinks } from '@/lib/pa-resolve';
import type { PaLink } from '@/components/farma/screens/ProspectoView';

const TTL = 3600;

export interface RelatedRow {
  nombre: string;
  nregistro: string;
}

async function queryRelatedByPa(nregistro: string, principio: string): Promise<RelatedRow[]> {
  return await sql`
    SELECT DISTINCT fc.nombre, fc.nregistro
    FROM pa_cache pa JOIN farma_name_cache fc ON pa.nregistro = fc.nregistro
    WHERE pa.principio = ${principio.toLowerCase()} AND pa.nregistro != ${nregistro}
    ORDER BY fc.nombre LIMIT 5
  ` as RelatedRow[];
}

async function queryRelatedByAtc(nregistro: string, atcL4Code: string): Promise<RelatedRow[]> {
  return await sql`
    SELECT DISTINCT fc.nombre, fc.nregistro
    FROM atc_cache atc JOIN farma_name_cache fc ON atc.nregistro = fc.nregistro
    WHERE atc.code = ${atcL4Code} AND atc.nregistro != ${nregistro}
    ORDER BY fc.nombre LIMIT 5
  ` as RelatedRow[];
}

export const getCanonicalPaLinks = unstable_cache(
  resolveMedicamentoPaLinks,
  ['prospect-canonical-pa-links'],
  { revalidate: TTL, tags: ['pa-related'] },
);

export const getRelatedByPa = unstable_cache(
  (nregistro: string, principio: string): Promise<RelatedRow[]> => queryRelatedByPa(nregistro, principio),
  ['prospect-related-pa'],
  { revalidate: TTL, tags: ['pa-related'] },
);

export const getRelatedByAtc = unstable_cache(
  (nregistro: string, atcL4Code: string): Promise<RelatedRow[]> => queryRelatedByAtc(nregistro, atcL4Code),
  ['prospect-related-atc'],
  { revalidate: TTL, tags: ['atc-related'] },
);

export const getLetterCount = unstable_cache(
  (letter: string): Promise<number> => countByLetter(letter),
  ['prospect-letter-count'],
  { revalidate: TTL, tags: ['letter-count'] },
);

export type { PaLink };
