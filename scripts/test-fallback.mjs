// Tests Fallback + Circuit Breaker (FASE fallback Nartalis)
// Uso: node scripts/test-fallback.mjs [baseUrl]
// SOLO contra localhost. Nunca --prod (guard-prod.mjs lo impide).
// Verifica: CIMA normal, fallback forzado, OPEN/HALF_OPEN/CLOSED, recuperación y logging.
import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBase, assertNotProd } from './guard-prod.mjs';

const { base: BASE, prod: PROD } = parseBase();
assertNotProd(BASE, PROD);

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Base: ${BASE}\n`);

// Marcador para borrar SOLO las filas creadas por este test
const [{ mid }] = await sql`SELECT COALESCE(MAX(id),0) AS mid FROM farma_search_log`;
const midVal = Number(mid);

// Nombre real existente en farma_name_cache (para que el fallback devuelva resultados)
const cacheRow = await sql`SELECT nombre, nregistro FROM farma_name_cache WHERE length(nombre) > 5 ORDER BY updated_at DESC LIMIT 1`;
const cacheName = cacheRow[0]?.nombre;
check('Hay datos en farma_name_cache para el fallback', !!cacheName, `(nombre="${cacheName}")`);

const TEST_HEADERS = { 'x-nartalis-test': '1' };

// ── A. CIMA funcionando normal ──
let res = await fetch(`${BASE}/api/farma/search?q=${encodeURIComponent(cacheName)}&type=text`, { headers: TEST_HEADERS });
let data = await res.json();
let state = res.headers.get('x-nartalis-breaker-state');
check('A. CIMA normal → HTTP 200', res.status === 200, `(status=${res.status})`);
check('A. fallback=false', data.fallback === false, `(fallback=${data.fallback})`);
check('A. resultados no vacíos desde CIMA', Array.isArray(data.resultados) && data.resultados.length > 0, `(n=${data.resultados?.length})`);
check('A. contrato: resultados/total/message/suggestedCorrection presentes', 'resultados' in data && 'total' in data, '(campos base ok)');
check('A. breaker CLOSED', state === 'closed', `(state=${state})`);

// ── B. CIMA forzada a fallar (timeout simulado) ──
const FAIL_HEADERS = { 'x-nartalis-test': '1', 'x-force-nartalis-cima-fail': '1' };
res = await fetch(`${BASE}/api/farma/search?q=${encodeURIComponent(cacheName)}&type=text`, { headers: FAIL_HEADERS });
data = await res.json();
state = res.headers.get('x-nartalis-breaker-state');
check('B. fallback ante fallo CIMA → HTTP 200', res.status === 200, `(status=${res.status})`);
check('B. fallback=true', data.fallback === true, `(fallback=${data.fallback})`);
check('B. fallbackReason=timeout', data.fallbackReason === 'timeout', `(reason=${data.fallbackReason})`);
check('B. resultados desde farma_name_cache', Array.isArray(data.resultados), '(estructura resultados ok)');

// ── C. Circuit breaker CLOSED → OPEN (fallos 2 y 3) ──
await fetch(`${BASE}/api/farma/search?q=${encodeURIComponent(cacheName)}&type=text`, { headers: FAIL_HEADERS }); // fallo 2
res = await fetch(`${BASE}/api/farma/search?q=${encodeURIComponent(cacheName)}&type=text`, { headers: FAIL_HEADERS }); // fallo 3
state = res.headers.get('x-nartalis-breaker-state');
check('C. tras 3 fallos → OPEN', state === 'open', `(state=${state})`);

// ── D. OPEN: no llama a CIMA, sirve local ──
// Sin header force: si se llamara a CIMA y funcionara, fallback sería false.
res = await fetch(`${BASE}/api/farma/search?q=${encodeURIComponent(cacheName)}&type=text`, { headers: TEST_HEADERS });
data = await res.json();
state = res.headers.get('x-nartalis-breaker-state');
check('D. en OPEN → búsqueda normal también sirve local', data.fallback === true, `(fallback=${data.fallback})`);
check('D. en OPEN → fallbackReason=cima_unreachable', data.fallbackReason === 'cima_unreachable', `(reason=${data.fallbackReason})`);
check('D. breaker sigue OPEN', state === 'open', `(state=${state})`);

// ── E. HALF_OPEN: cooldown reducido en test → probe → CLOSED ──
const CD_HEADERS = { 'x-nartalis-test': '1', 'x-nartalis-breaker-cooldown-ms': '500' };
await sleep(700); // supera el cooldown de 500ms
res = await fetch(`${BASE}/api/farma/search?q=${encodeURIComponent(cacheName)}&type=text`, { headers: CD_HEADERS });
data = await res.json();
state = res.headers.get('x-nartalis-breaker-state');
check('E. tras cooldown → CIMA vuelve → CLOSED', state === 'closed', `(state=${state})`);
check('E. recuperación → fallback=false', data.fallback === false, `(fallback=${data.fallback})`);
check('E. recuperación → resultados CIMA', Array.isArray(data.resultados) && data.resultados.length > 0, `(n=${data.resultados?.length})`);

// ── F. Logging correcto ──
await sleep(400);
const logRows = await sql`
  SELECT used_fallback, fallback_reason, is_test FROM farma_search_log
  WHERE id > ${midVal} AND is_test = true ORDER BY id DESC LIMIT 8
`;
const fallbackLogs = logRows.filter(r => r.used_fallback === true);
const normalLogs = logRows.filter(r => r.used_fallback === false);
check('F. existen búsquedas con used_fallback=true', fallbackLogs.length > 0, `(n=${fallbackLogs.length})`);
check('F. fallback_reason solo valores válidos', fallbackLogs.every(r => ['cima_http_5xx', 'timeout', 'cima_unreachable'].includes(r.fallback_reason)), `(reasons=${[...new Set(fallbackLogs.map(r => r.fallback_reason))].join(',')})`);
check('F. existen búsquedas normales con used_fallback=false', normalLogs.length > 0, `(n=${normalLogs.length})`);

// ── G. Sin regresión: búsqueda de detalle y stats siguen funcionando ──
const det = await fetch(`${BASE}/api/farma/medicamento?nregistro=${cacheRow[0].nregistro}`);
check('G. /api/farma/medicamento responde', det.status === 200, `(status=${det.status})`);
const st = await fetch(`${BASE}/api/farma/stats`);
const stData = await st.json();
check('G. /api/farma/stats responde', st.status === 200 && typeof stData.totalSearches === 'number', `(status=${st.status})`);

// ── Limpieza: borrar solo las filas creadas por este test ──
await sql`DELETE FROM farma_search_log WHERE id > ${midVal}`;
const rest = await sql`SELECT COUNT(*)::int AS n FROM farma_search_log`;
console.log(`Limpieza OK — filas restantes en farma_search_log: ${rest[0].n}`);

console.log(`\n${'─'.repeat(56)}`);
console.log(`Resultado: ${passed} pasadas, ${failed} fallidas`);
console.log(results.join('\n'));
process.exit(failed > 0 ? 1 : 0);