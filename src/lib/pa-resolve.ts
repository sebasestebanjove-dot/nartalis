// NARTALIS - SEO FASE 2B
// Resolución canónica de URLs /principios-activos/<slug>.
// Fuente de verdad: farma_principles (entidad) y farma_principle_aliases (redirect 301).
// Reutiliza src/lib/pa-normalize.mjs (única fuente de normalización).
import { sql } from '@/lib/db';
import { slugifyPrincipio, normalizedKey } from '@/lib/pa-normalize.mjs';

export interface PaEntity {
  id: number;
  slug: string;
  nombre_canonico: string;
  tipo: string;
  medicine_count: number;
  active: boolean;
}

export interface PaResolution {
  entity: PaEntity | null;        // entidad indexable (active simple)
  aliasRedirectTo: string | null; // alias 301 -> canonical slug
  notFound: boolean;              // true => 404 real
}

// Resuelve el slug de la URL contra farma_principles / farma_principle_aliases.
// - Entidad activa => page 200.
// - Entidad existente pero NO indexable => 404 real (no se inventa pagina).
// - Alias demostrado => 301 al slug canónico.
// - Nada => 404 real.
export async function resolvePa(slug: string): Promise<PaResolution> {
  const nslug = slugifyPrincipio(slug);

  const rows = await sql`
    SELECT id, slug, nombre_canonico, tipo, active, medicine_count
    FROM farma_principles
    WHERE slug = ${nslug}
  ` as PaEntity[];

  if (rows.length) {
    const e = rows[0];
    // Solo entidades indexables (active) renderizan página. Las inactivas → 404.
    if (e.active) return { entity: e, aliasRedirectTo: null, notFound: false };
    return { entity: null, aliasRedirectTo: null, notFound: true };
  }

  // alias?
  const a = await sql`
    SELECT principle_id FROM farma_principle_aliases WHERE alias = ${nslug}
  ` as { principle_id: number }[];
  if (a.length) {
    const t = await sql`
      SELECT slug FROM farma_principles WHERE id = ${a[0].principle_id} AND active = true
    ` as { slug: string }[];
    if (t.length) return { entity: null, aliasRedirectTo: t[0].slug, notFound: false };
  }

  return { entity: null, aliasRedirectTo: null, notFound: true };
}

// Componentes (PA simples indexables) de un medicamento para enlaces
// cross-link Prospecto -> PA. Solo enlaza los que tienen entidad indexable.
export async function resolveMedicamentoPaLinks(
  pactivos: string | null,
  principiosActivosNombres: string[] | undefined,
): Promise<{ slug: string; nombre: string }[]> {
  const names: string[] = [];
  if (pactivos) {
    // pactivos puede ser "A, B" o "A + B" o vtm simple
    pactivos.split(/,|\+/).map(s => s.trim()).filter(Boolean).forEach(n => names.push(n));
  }
   if (principiosActivosNombres && principiosActivosNombres.length) {
     principiosActivosNombres.forEach((n) => { if (n) names.push(n); });
   }
  if (names.length === 0) return [];

  const keys = [...new Set(names)].map(n => normalizedKey(n));
  const rows = await sql`
    SELECT slug, nombre_canonico, normalized_key
    FROM farma_principles
    WHERE normalized_key = ANY(${keys})
      AND tipo = 'simple' AND active = true
    ORDER BY slug
  ` as { slug: string; nombre_canonico: string; normalized_key: string }[];

  const byKey = new Map(rows.map(r => [r.normalized_key, r]));
  const out: { slug: string; nombre: string }[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    const e = byKey.get(k);
    if (e && !seen.has(e.slug)) {
      seen.add(e.slug);
      out.push({ slug: e.slug, nombre: e.nombre_canonico });
    }
  }
  return out;
}
