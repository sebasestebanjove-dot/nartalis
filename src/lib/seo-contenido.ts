// NARTALIS - FASE B: capa de acceso a datos para contenido SEO generado.
// Fuente única de datos: tablas existentes. NO llama a CIMA en build.
import { sql } from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nartalis.com';

export interface PaSeo {
  id: number;
  slug: string;
  nombre_canonico: string;
  medicine_count: number;
  atc3Code: string | null;
  atc3Name: string | null;
}

export interface AtcSeo {
  code: string;
  name: string;
  medicine_count: number;
  principle_count: number;
}

export interface PaDrug {
  nombre: string;
  nregistro: string;
}

export interface AtcSubgroup {
  code: string;
  name: string;
  count: number;
}

// Devuelve un PA indexable con su grupo ATC nivel 3 asociado.
export async function getPaSeoBySlug(slug: string): Promise<PaSeo | null> {
  const rows = await sql`
    SELECT fp.id, fp.slug, fp.nombre_canonico, fp.medicine_count,
      (SELECT a.code FROM atc_cache a
        JOIN pa_cache pc ON pc.nregistro = a.nregistro
        WHERE pc.pa_principle_id = fp.id AND a.level = 3
        LIMIT 1) AS atc3_code,
      (SELECT a.name FROM atc_cache a
        JOIN pa_cache pc ON pc.nregistro = a.nregistro
        WHERE pc.pa_principle_id = fp.id AND a.level = 3
        LIMIT 1) AS atc3_name
    FROM farma_principles fp
    WHERE fp.slug = ${slug}
      AND fp.tipo = 'simple' AND fp.active = true
      AND fp.medicine_count >= 5
  ` as {
    id: number; slug: string; nombre_canonico: string; medicine_count: number;
    atc3_code: string | null; atc3_name: string | null;
  }[];
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    nombre_canonico: r.nombre_canonico,
    medicine_count: r.medicine_count,
    atc3Code: r.atc3_code,
    atc3Name: r.atc3_name,
  };
}

// Lista de PA indexables ordenados por número de medicamentos (para sitemap T1).
export async function listPaSeo(limit = 250): Promise<PaSeo[]> {
  const rows = await sql`
    SELECT fp.id, fp.slug, fp.nombre_canonico, fp.medicine_count,
      (SELECT a.code FROM atc_cache a
        JOIN pa_cache pc ON pc.nregistro = a.nregistro
        WHERE pc.pa_principle_id = fp.id AND a.level = 3
        LIMIT 1) AS atc3_code,
      (SELECT a.name FROM atc_cache a
        JOIN pa_cache pc ON pc.nregistro = a.nregistro
        WHERE pc.pa_principle_id = fp.id AND a.level = 3
        LIMIT 1) AS atc3_name
    FROM farma_principles fp
    WHERE fp.tipo = 'simple' AND fp.active = true AND fp.medicine_count >= 5
    ORDER BY fp.medicine_count DESC, fp.nombre_canonico ASC
    LIMIT ${limit}
  ` as {
    id: number; slug: string; nombre_canonico: string; medicine_count: number;
    atc3_code: string | null; atc3_name: string | null;
  }[];
  return rows.map(r => ({
    id: r.id,
    slug: r.slug,
    nombre_canonico: r.nombre_canonico,
    medicine_count: r.medicine_count,
    atc3Code: r.atc3_code,
    atc3Name: r.atc3_name,
  }));
}

// Medicamentos asociados a un PA (hasta un límite razonable).
export async function getPaDrugs(principleId: number, limit = 60): Promise<PaDrug[]> {
  const rows = await sql`
    SELECT DISTINCT fc.nombre, fc.nregistro
    FROM pa_cache pc
    JOIN farma_name_cache fc ON fc.nregistro = pc.nregistro
    WHERE pc.pa_principle_id = ${principleId}
    ORDER BY fc.nombre
    LIMIT ${limit}
  ` as PaDrug[];
  return rows;
}

// Indica si algún medicamento del PA es genérico (sufijo EFG en nombre oficial CIMA).
export async function paHasGeneric(principleId: number): Promise<boolean> {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM pa_cache pc
      JOIN farma_name_cache fc ON fc.nregistro = pc.nregistro
      WHERE pc.pa_principle_id = ${principleId}
        AND UPPER(fc.nombre) LIKE '% EFG'
    ) AS found
  ` as { found: boolean }[];
  return !!row?.found;
}

// Devuelve un grupo terapéutico ATC nivel 3 con volumen suficiente.
export async function getAtcSeoByCode(code: string): Promise<AtcSeo | null> {
  const upper = code.toUpperCase();
  const rows = await sql`
    SELECT a.code, a.name,
      COUNT(DISTINCT a.nregistro)::int AS medicine_count,
      COUNT(DISTINCT pc.pa_principle_id)::int AS principle_count
    FROM atc_cache a
    LEFT JOIN pa_cache pc ON pc.nregistro = a.nregistro
    WHERE a.level = 3 AND a.code = ${upper}
    GROUP BY a.code, a.name
  ` as { code: string; name: string; medicine_count: number; principle_count: number }[];
  const r = rows[0];
  if (!r || r.medicine_count < 20) return null;
  return { code: r.code, name: r.name, medicine_count: r.medicine_count, principle_count: r.principle_count };
}

// Grupos ATC nivel 3 con volumen suficiente (para sitemap T2).
export async function listAtcSeo(minMedicines = 20, limit = 120): Promise<AtcSeo[]> {
  const rows = await sql`
    SELECT a.code, a.name,
      COUNT(DISTINCT a.nregistro)::int AS medicine_count,
      COUNT(DISTINCT pc.pa_principle_id)::int AS principle_count
    FROM atc_cache a
    LEFT JOIN pa_cache pc ON pc.nregistro = a.nregistro
    WHERE a.level = 3
    GROUP BY a.code, a.name
    HAVING COUNT(DISTINCT a.nregistro) >= ${minMedicines}
    ORDER BY medicine_count DESC, a.code ASC
    LIMIT ${limit}
  ` as { code: string; name: string; medicine_count: number; principle_count: number }[];
  return rows;
}

// Subgrupos ATC nivel 4 de un grupo nivel 3.
export async function getAtcSubgroups(parentCode: string): Promise<AtcSubgroup[]> {
  const rows = await sql`
    SELECT DISTINCT code, name, COUNT(DISTINCT nregistro)::int AS count
    FROM atc_cache
    WHERE level = 4 AND parent_code = ${parentCode}
    GROUP BY code, name
    ORDER BY code
  ` as AtcSubgroup[];
  return rows;
}

// Principios activos (indexables) de un grupo ATC nivel 3.
export async function getAtcPrinciples(parentCode: string, limit = 60): Promise<PaSeo[]> {
  const rows = await sql`
    SELECT fp.id, fp.slug, fp.nombre_canonico, fp.medicine_count,
      ${parentCode} AS atc3_code,
      (SELECT a.name FROM atc_cache a WHERE a.code = ${parentCode} AND a.level = 3 LIMIT 1) AS atc3_name
    FROM atc_cache a
    JOIN pa_cache pc ON pc.nregistro = a.nregistro
    JOIN farma_principles fp ON fp.id = pc.pa_principle_id
    WHERE a.level = 3 AND a.code = ${parentCode}
      AND fp.tipo = 'simple' AND fp.active = true AND fp.medicine_count >= 5
    GROUP BY fp.id, fp.slug, fp.nombre_canonico, fp.medicine_count
    ORDER BY fp.medicine_count DESC, fp.nombre_canonico ASC
    LIMIT ${limit}
  ` as {
    id: number; slug: string; nombre_canonico: string; medicine_count: number;
    atc3_code: string; atc3_name: string | null;
  }[];
  return rows.map(r => ({
    id: r.id,
    slug: r.slug,
    nombre_canonico: r.nombre_canonico,
    medicine_count: r.medicine_count,
    atc3Code: r.atc3_code,
    atc3Name: r.atc3_name,
  }));
}

// Medicamentos de un grupo ATC nivel 3.
export async function getAtcDrugs(parentCode: string, limit = 80): Promise<PaDrug[]> {
  const rows = await sql`
    SELECT DISTINCT fc.nombre, fc.nregistro
    FROM atc_cache a
    JOIN farma_name_cache fc ON fc.nregistro = a.nregistro
    WHERE a.level = 3 AND a.code = ${parentCode}
    ORDER BY fc.nombre
    LIMIT ${limit}
  ` as PaDrug[];
  return rows;
}

export const SITE_URL_BASE = SITE_URL;
