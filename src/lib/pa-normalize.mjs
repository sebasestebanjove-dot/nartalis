// NARTALIS - SEO FASE 2A.2
// ÚNICA FUENTE DE VERDAD de normalización/classificación de principios activos.
// La usan tanto populate-farma-principles.mjs como el runtime (ingestPaCache)
// para garantizar que siempre producen el MISMO slug / normalized_key / tipo.
//
// Reglas importadas de FASE 2A.1 (scripts/populate-farma-principles.mjs).
// Si cambias algo aquí, DEBES re-ejecutar la población y checkear idempotencia.

const LITERAL_BASURA_LIST = ['multicomponente', 'no aplica', 's/a', 's.a.', 'varios', 'otro'];
const COMPOUND_SEP = /[,+]/;

// strip + lowercase + sin acentos (NFD). Base de todas las salidas.
function normText(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// FASE 2A.1: normalized_key = normText sin ningún carácter no alfanumérico.
export function normalizedKey(s) {
  return normText(s).replace(/[^a-z0-9]/g, '');
}

// FASE 2A.1: slugify (idéntico en espíritu a src/lib/slug.ts y a 2A.1).
export function slugifyPrincipio(s) {
  return normText(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// FASE 2A.1: capitalizeName (presentación, no afecta slug/key).
export function capitalizeName(s) {
  return normText(s)
    .split(/[\s+/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// FASE 2A.1: classify -> 'simple' | 'compuesto' | 'valor_basura'.
// Debe devolver EXACTAMENTE lo mismo que 2A.1 para el mismo input.
export function classify(s) {
  const low = String(s).toLowerCase().trim();
  const noAlias = low.split(':').pop() || low;
  if (LITERAL_BASURA_LIST.includes(noAlias)) return 'valor_basura';
  if (!/[a-zà-ÿ]/.test(low)) return 'valor_basura'; // sin letras -> no PA
  if (COMPOUND_SEP.test(low)) return 'compuesto'; // coma o '+'
  return 'simple';
}