// Tests FASE 2.1 — Normalización de búsquedas (Top 5 más buscados)
// Uso: node scripts/test-farma-stats.mjs [baseUrl]
import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:3000';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
const sql = neon(process.env.DATABASE_URL);

let passed = 0;
let failed = 0;
const results = [];
function check(name, cond, extra = '') {
  if (cond) { passed++; results.push(`  ✅ ${name}`); }
  else { failed++; results.push(`  ❌ ${name} ${extra}`); }
}
const norm = (s) => String(s).trim().toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Base: ${BASE}\n`);

// Limpiar restos de ejecuciones anteriores (idempotente)
await sql`DELETE FROM farma_search_log WHERE LOWER(TRIM(query)) LIKE 'zzztest%'`;

// Marcador para borrar SOLO las filas creadas por este test
const [{ mid }] = await sql`SELECT COALESCE(MAX(id),0) AS mid FROM farma_search_log`;
const midVal = Number(mid);

// Volumen que garantiza dominar el Top 5
const [{ mx }] = await sql`SELECT COALESCE(MAX(c),0)::int AS mx FROM (SELECT COUNT(*) AS c FROM farma_search_log GROUP BY LOWER(TRIM(query))) t`;
const base = Number(mx) + 20;

// ── Insertar datos históricos con mayúsculas y espacios mezclados ──
const insertN = async (q, n) => {
  for (let i = 0; i < n; i++) {
    await sql`INSERT INTO farma_search_log (query, search_type) VALUES (${q}, 'text')`;
  }
};
await insertN('zzztest-aspirina', base);
await insertN('ZZZTEST-ASPIRINA', base);
await insertN('  ZzZtEsT-AspIrInA  ', base);
await insertN('zzztest-paracetamol', base);
await insertN('ZZZTEST-PARACETAMOL', base);
await insertN('zzztest-ozempic', base);

// ── GET /api/farma/stats ──
const res = await fetch(`${BASE}/api/farma/stats`);
const data = await res.json();
const top = data.topQueries || [];
const asp = top.filter((t) => norm(t.q) === 'zzztest-aspirina');
const par = top.filter((t) => norm(t.q) === 'zzztest-paracetamol');

console.log('Top devuelto:', JSON.stringify(top));

check('GET /api/farma/stats → 200', res.status === 200, `(status=${res.status})`);
check('Estructura de respuesta correcta', typeof data.totalSearches === 'number' && Array.isArray(data.topQueries) && typeof data.dailyCount === 'number');

check('TEST 1 "Aspirina"/"aspirina"/"ASPIRINA" → UNA sola entrada', asp.length === 1, `(visto ${asp.length})`);
check('TEST 1 contador = suma de las variantes', asp.length === 1 && asp[0].count === base * 3, `(count=${asp[0]?.count}, esperado ${base * 3})`);

check('TEST 2 "  Aspirina  " (espacios) incrementa el mismo contador', asp.length === 1 && asp[0].count === base * 3);

check('TEST 3 "Paracetamol"/"PARACETAMOL" → UNA sola entrada', par.length === 1, `(visto ${par.length})`);
check('TEST 3 contador = suma', par.length === 1 && par[0].count === base * 2, `(count=${par[0]?.count}, esperado ${base * 2})`);

check('TEST 4 el Top no muestra a la vez "Aspirina" y "aspirina"', asp.length === 1);
const dupes = top.filter((t, i) => top.findIndex((x) => norm(x.q) === norm(t.q)) !== i);
check('TEST 4 ninguna clave normalizada se repite en el Top', dupes.length === 0, `(duplicadas: ${dupes.map((d) => d.q).join(', ')})`);

check('Etiqueta canónica legible ("Zzztest-aspirina")', asp.length === 1 && asp[0].q === 'Zzztest-aspirina', `(q="${asp[0]?.q}")`);

// Etiqueta titleCase aplicada a TODOS los elementos del Top.
// Propiedad funcional determinista: no depende de qué datos reales estén en el Top 5
// ni de la posición concreta de ninguno de ellos (la producción devuelve titleCase(qkey)
// y el test reconstruye titleCase(norm(q)) para comparar).
const titleCase = (s) => String(s).split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
const allCanonical = top.every((t) => t.q === titleCase(norm(t.q)));
check('Etiqueta titleCase en todos los elementos del Top', allCanonical, `(top=${JSON.stringify(top)})`);

// ── TEST 5 — la búsqueda farmacológica sigue funcionando y el log se normaliza ──
const s = await fetch(`${BASE}/api/farma/search?q=paracetamol`, { headers: { 'x-nartalis-test': '1' } });
const sd = await s.json();
check('TEST 5 búsqueda farmacológica responde 200', s.status === 200, `(status=${s.status})`);
check('TEST 5 devuelve resultados', Array.isArray(sd.resultados) && sd.resultados.length > 0, `(resultados=${sd.resultados?.length})`);

await sleep(300);
const after = await sql`SELECT query, COUNT(*)::int AS c FROM farma_search_log WHERE id > ${midVal} AND LOWER(TRIM(query)) = 'paracetamol' GROUP BY query`;
check('TEST 5 la nueva búsqueda se registra normalizada (query="paracetamol")', after.length === 1 && after[0].query === 'paracetamol', `(fila=${JSON.stringify(after[0])})`);

// ── Limpieza: borrar solo las filas creadas por el test ──
await sql`DELETE FROM farma_search_log WHERE id > ${midVal}`;
const rest = await sql`SELECT COUNT(*)::int AS n FROM farma_search_log`;
console.log(`Limpieza OK — filas restantes en farma_search_log: ${rest[0].n}`);

console.log(`\n${'─'.repeat(56)}`);
console.log(`Resultado: ${passed} pasadas, ${failed} fallidas`);
console.log(results.join('\n'));
process.exit(failed > 0 ? 1 : 0);
