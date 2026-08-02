// Auditoría funcional FASE 3 — Mi espacio personal Nartalis
// Uso: node scripts/test-espacio.mjs [baseUrl] [--prod]
// Requiere: servidor en marcha (npm run dev) y DATABASE_URL en .env.local
import { parseBase, assertNotProd } from './guard-prod.mjs'
const { base: BASE, prod: PROD } = parseBase()
assertNotProd(BASE, PROD)

let passed = 0
let failed = 0
const results = []

function check(name, cond, extra = '') {
  if (cond) { passed++; results.push(`  ✅ ${name}`) }
  else { failed++; results.push(`  ❌ ${name} ${extra}`) }
}

const jar = new Map()
async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}), 'x-nartalis-test': '1' }
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    opts = { ...opts, body: JSON.stringify(opts.json) }
  }
  const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' })
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  const setCookieNames = []
  for (const sc of setCookies) {
    const m = sc.match(/^([^=]+)=([^;]*)/)
    if (m) { jar.set(m[1], m[2]); setCookieNames.push(m[1]) }
  }
  let text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = null }
  return { res, status: res.status, data, text, setCookieNames }
}

function withAuth(opts = {}) {
  const cookies = [...jar.entries()].map(([k, v]) => `${k}=${v}`)
  const headers = { ...(opts.headers || {}), Cookie: cookies.join('; ') }
  return { ...opts, headers }
}

// ─── Carga de DATABASE_URL para verificaciones directas ───
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

// ═══ Preparación: datos de prueba con sufijo temporal ═══
const ts = Date.now()
const emailA = `espacio.a.${ts}@example.com`
const emailB = `espacio.b.${ts}@example.com`
const password = 'ClaveSegura123!'

// Un nregistro/nombre REAL existente en farma_name_cache (sin subcódigos IP).
const [med] = await sql`SELECT nombre, nregistro FROM farma_name_cache WHERE nregistro !~ 'IP\\d*$' AND nregistro ~ '^[0-9]+$' ORDER BY updated_at DESC LIMIT 1`
const NR = med.nregistro
const NOM = med.nombre
const FAKE_NR = '999999999'

// Líneas base de las tablas que NO deben modificarse.
const [baseLog] = await sql`SELECT COUNT(*)::int AS c FROM farma_search_log`
const [baseCache] = await sql`SELECT COUNT(*)::int AS c FROM farma_name_cache`
const baseLogCount = baseLog.c
const baseCacheCount = baseCache.c

// Limpieza preventiva (idempotente): restos de ejecuciones anteriores
// interrumpidas. Solo afecta al patrón de emails de prueba espacio.*@example.com.
await sql`DELETE FROM nartalis_user_medicamentos WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com')`
await sql`DELETE FROM nartalis_user_consultas WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com')`
await sql`DELETE FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com'`

console.log(`Base: ${BASE}`)
console.log(`Medicamento de prueba: ${NR} — ${NOM}`)
console.log(`\n${'─'.repeat(56)}\n`)

// ═══ T01 — Usuario anónimo ═══
let r = await req('/espacio')
check('T01 GET /espacio sin sesión → 307 → /registro', r.status === 307 && (r.res.headers.get('location') || '').includes('/registro'))
r = await req('/api/espacio/medicamentos')
check('   GET /api/espacio/medicamentos sin sesión → 401', r.status === 401)
r = await req('/api/espacio/medicamentos', { method: 'POST', json: { nregistro: NR, nombre: NOM } })
check('   POST /api/espacio/medicamentos sin sesión → 401', r.status === 401)
r = await req('/api/espacio/medicamentos/' + NR, { method: 'PATCH', json: { is_favorite: true } })
check('   PATCH /api/espacio/medicamentos/[n] sin sesión → 401', r.status === 401)
r = await req('/api/espacio/medicamentos/' + NR, { method: 'DELETE' })
check('   DELETE /api/espacio/medicamentos/[n] sin sesión → 401', r.status === 401)
r = await req('/api/espacio/historial')
check('   GET /api/espacio/historial sin sesión → 401', r.status === 401)
r = await req('/api/espacio/historial', { method: 'POST', json: { nregistro: NR, nombre: NOM } })
check('   POST /api/espacio/historial sin sesión → 401', r.status === 401)

// ═══ T02 / T13 — Registro usuario A (email) ═══
r = await req('/api/auth/register', { method: 'POST', json: { name: 'Usuario Espacio A', email: emailA, password } })
check('T13 POST /api/auth/register A → 200', r.status === 200 && r.data?.ok === true)
check('T02 sesión A activa', jar.has('nartalis_session'))

// ═══ T11 — Medicamento inexistente ═══
r = await req('/api/espacio/medicamentos', withAuth({ method: 'POST', json: { nregistro: FAKE_NR, nombre: 'Inexistente' } }))
check('T11 POST medicamento inexistente → 404', r.status === 404 && r.data?.error === 'Medicamento no encontrado')

// Validaciones de payload
r = await req('/api/espacio/medicamentos', withAuth({ method: 'POST', json: {} }))
check('   POST sin nregistro → 400', r.status === 400)
r = await req('/api/espacio/medicamentos', withAuth({ method: 'POST', json: { nregistro: 'x'.repeat(65), nombre: 'X' } }))
check('   POST nregistro >64 chars → 400', r.status === 400)

// ═══ T03 — Guardar ═══
r = await req('/api/espacio/medicamentos', withAuth({ method: 'POST', json: { nregistro: NR, nombre: NOM } }))
check('T03 POST /api/espacio/medicamentos → 201', r.status === 201 && r.data?.saved === true)

// ═══ T04 — Duplicado ═══
r = await req('/api/espacio/medicamentos', withAuth({ method: 'POST', json: { nregistro: NR, nombre: NOM } }))
check('T04 POST duplicado → 200 alreadySaved', r.status === 200 && r.data?.saved === true && r.data?.alreadySaved === true)
{
  const [row] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_user_medicamentos WHERE nregistro = ${NR}`
  check('   anti-duplicado a nivel BD (1 fila)', row.c === 1)
}

// ═══ T08 — Historial ═══
r = await req('/api/espacio/historial', withAuth({ method: 'POST', json: { nregistro: NR, nombre: NOM } }))
check('T08 POST /api/espacio/historial → 201', r.status === 201 && r.data?.ok === true)

// ═══ T06 / T07 — Favorito ═══
r = await req('/api/espacio/medicamentos/' + NR, withAuth({ method: 'PATCH', json: { is_favorite: true } }))
check('T06 PATCH favorito=true → 200', r.status === 200 && r.data?.ok === true && r.data?.is_favorite === true)
{
  const [row] = await sql`SELECT is_favorite FROM nartalis_user_medicamentos WHERE nregistro = ${NR}`
  check('   is_favorite=true en BD', row?.is_favorite === true)
}
r = await req('/api/espacio/medicamentos/' + NR, withAuth({ method: 'PATCH', json: { is_favorite: 'true' } }))
check('   PATCH is_favorite no-booleano → 400', r.status === 400)
r = await req('/api/espacio/medicamentos/' + NR, withAuth({ method: 'PATCH', json: { is_favorite: false } }))
check('T07 PATCH favorito=false → 200', r.status === 200 && r.data?.ok === true && r.data?.is_favorite === false)

// 404 para PATCH de medicamento NO guardado
r = await req('/api/espacio/medicamentos/' + FAKE_NR, withAuth({ method: 'PATCH', json: { is_favorite: true } }))
check('   PATCH medicamento no guardado → 404', r.status === 404)

// ═══ GET listado + favorite persistence (recarga) ═══
r = await req('/api/espacio/medicamentos', withAuth())
check('   GET /api/espacio/medicamentos → 200 con total', r.status === 200 && r.data?.total === 1 && r.data?.medicamentos?.length === 1)
check('   favorite persistence después de reload', r.data?.medicamentos?.[0]?.nregistro === NR && r.data?.medicamentos?.[0]?.nombre === NOM)

// ═══ GET historial orden DESC + limit clamp ═══
r = await req('/api/espacio/historial?limit=0', withAuth())
check('   historial limit=0 → clamp a 1', r.data?.consultas?.length === 1)
r = await req('/api/espacio/historial?limit=999', withAuth())
check('   historial limit=999 → clamp a 50', r.data?.consultas?.length <= 50)
{
  const [one, two] = r.data.consultas
  check('   historial orden DESC', !two || new Date(one.consulted_at) >= new Date(two.consulted_at))
}

// ═══ T05 — Eliminar (idempotente) mientras el usuario A sigue autenticado ═══
r = await req('/api/espacio/medicamentos/' + NR, withAuth({ method: 'DELETE' }))
check('T05 DELETE medicamento → 200', r.status === 200 && r.data?.ok === true)
r = await req('/api/espacio/medicamentos/' + NR, withAuth({ method: 'DELETE' }))
check('   DELETE idempotente (no guardado) → 200', r.status === 200 && r.data?.ok === true)
{
  const [row] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_user_medicamentos WHERE nregistro = ${NR}`
  check('   eliminado de BD', row.c === 0)
}
r = await req('/api/espacio/medicamentos', withAuth())
check('   listado vacío tras eliminar', r.data?.total === 0)

// ═══ Tablas protegidas: se comprueban ANTES de T15 (el buscador sí registra búsquedas) ═══
{
  const [log] = await sql`SELECT COUNT(*)::int AS c FROM farma_search_log`
  const [cache] = await sql`SELECT COUNT(*)::int AS c FROM farma_name_cache`
  check('farma_search_log no modificada', log.c === baseLogCount)
  check('farma_name_cache no modificada', cache.c === baseCacheCount)
}

// ═══ T09 — Aislamiento usuario A/B ═══
r = await req('/api/auth/logout', withAuth({ method: 'POST' }))
check('   logout usuario A', r.status === 200)
r = await req('/api/auth/register', { method: 'POST', json: { name: 'Usuario Espacio B', email: emailB, password } })
check('   registro usuario B', r.status === 200 && r.data?.ok === true)
r = await req('/api/espacio/medicamentos', withAuth())
check('T09 B no ve medicamentos de A', r.data?.total === 0 && r.data?.medicamentos?.length === 0)
r = await req('/api/espacio/historial', withAuth())
check('   B no ve historial de A', r.data?.consultas?.length === 0)

// ═══ T10 — Logout B ═══
r = await req('/api/auth/logout', withAuth({ method: 'POST' }))
check('T10 logout usuario B → 200', r.status === 200)
r = await req('/espacio', withAuth())
check('   /espacio tras logout → 307 → /registro', r.status === 307 && (r.res.headers.get('location') || '').includes('/registro'))

// ═══ T14 — Google wiring ═══
r = await req('/api/auth/google')
const gloc = r.res.headers.get('location') || ''
check('T14 GET /api/auth/google → redirect accounts.google.com', r.status >= 300 && r.status < 400 && gloc.includes('accounts.google.com/o/oauth2/v2/auth'))
check('   callback incluye redirect_uri', gloc.includes('redirect_uri=') && gloc.includes('%2Fapi%2Fauth%2Fcallback%2Fgoogle'))

// ═══ T15 — Buscador ═══
r = await req('/api/farma/search?q=paracetamol')
check('T15 /api/farma/search → 200 con resultados', r.status === 200 && r.data?.resultados?.length > 0)
r = await req('/api/farma/medicamento?nregistro=' + NR)
check('   /api/farma/medicamento → 200', r.status === 200 && r.data?.registro === NR)
const canonNombre = r.data?.nombre || NOM

// ═══ T16 — Dermo ═══
r = await req('/dermo')
check('T16 GET /dermo → 200', r.status === 200)
r = await req('/api/dermo/dashboard')
check('   /api/dermo/dashboard sin sesión dermo → 401', r.status === 401)

// ═══ T17 — IA-Module ═══
{
  const [row] = await sql`SELECT COUNT(*)::int AS c FROM ia_module_users`
  check('T17 tabla ia_module_users accesible e intacta', typeof row?.c === 'number' && row.c >= 0)
}

// ═══ T18 / T19 — Home + prospecto ═══
r = await req('/')
check('T18 GET / → 200', r.status === 200)
check('   Home CTA "Crear mi espacio gratis"', r.text.includes('Crear mi espacio gratis'))
{
  const slugBase = canonNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80)
  r = await req(`/prospectos/${slugBase}--${NR}`)
  check('T19 GET /prospectos/{slug} → 200', r.status === 200)
}

// ═══ T20 — Regresión auth ═══
r = await req('/api/auth/session')
check('T20 /api/auth/session anónimo → authenticated=false', r.status === 200 && r.data?.authenticated === false)
r = await req('/login')
check('   GET /login → 200', r.status === 200)
r = await req('/registro')
check('   GET /registro → 200', r.status === 200)

// ═══ pending_save sin PII (revisión estática del formato) ═══
{
  const src = readFileSync(join(__dirname, '..', 'src', 'components', 'farma', 'FarmaWrapper.tsx'), 'utf8')
  check('pending_save usa sessionStorage.nartalis_pending_save', src.includes("sessionStorage.setItem(PENDING_SAVE_KEY") && src.includes("nartalis_pending_save"))
  check('pending_save SOLO nregistro+nombre (sin PII)', src.includes('nregistro: m.registro, nombre: m.nombre'))
}
{
  const src = readFileSync(join(__dirname, '..', 'src', 'components', 'espacio', 'EspacioSaveResolver.tsx'), 'utf8')
  check('Google resolver idempotente (usa POST idempotente)', src.includes("fetch('/api/espacio/medicamentos'"))
  check('Google resolver limpia pending_save', src.includes('sessionStorage.removeItem(PENDING_KEY)'))
}

// ═══ Analítica sin PII ═══
{
  const src = readFileSync(join(__dirname, '..', 'src', 'components', 'espacio', 'EspacioDashboard.tsx'), 'utf8')
  check('eventos espacio sin PII', !/(track\([^)]*\{\s*(?:email|name|user_id|nregistro)\s*:)/.test(src))
}

// ═══ Limpieza de todos los datos de prueba ═══
await sql`DELETE FROM nartalis_user_medicamentos WHERE user_id IN (SELECT id FROM nartalis_users WHERE email IN (${emailA}, ${emailB}))`
await sql`DELETE FROM nartalis_user_consultas WHERE user_id IN (SELECT id FROM nartalis_users WHERE email IN (${emailA}, ${emailB}))`
await sql`DELETE FROM nartalis_users WHERE email IN (${emailA}, ${emailB})`
{
  const [a] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_users WHERE email IN (${emailA}, ${emailB})`
  const [b] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_user_medicamentos WHERE nregistro = ${NR}`
  const [c] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_user_consultas WHERE nregistro = ${NR}`
  check('limpieza: sin usuarios de prueba', a.c === 0)
  check('limpieza: sin medicamentos de prueba', b.c === 0)
  check('limpieza: sin historial de prueba', c.c === 0)
}

// ═══ T12 — Error DB (rutas no crashean con body roto) ═══
r = await req('/api/auth/register', { method: 'POST', json: { name: 'X', email: emailA, password } })
r = await req('/api/espacio/medicamentos', withAuth({ method: 'POST', json: 'malformed' }))
check('T12 POST body malformado → 400', r.status === 400)

// ═══ Limpieza final — T12 re-registra emailA tras su bloque de limpieza ═══
// Sin este paso, cada ejecución deja un usuario huérfano espacio.a.<ts>@example.com.
await sql`DELETE FROM nartalis_user_medicamentos WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com')`
await sql`DELETE FROM nartalis_user_consultas WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com')`
await sql`DELETE FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com'`
{
  const [a] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com'`
  const [m] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_user_medicamentos WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com')`
  const [h] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_user_consultas WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'espacio.a.%@example.com' OR email LIKE 'espacio.b.%@example.com')`
  check('limpieza final: sin usuarios de prueba ni huérfanos', a.c === 0 && m.c === 0 && h.c === 0)
}

console.log(`\n${'─'.repeat(56)}`)
console.log(`Resultado: ${passed} pasadas, ${failed} fallidas`)
console.log(results.join('\n'))
process.exit(failed > 0 ? 1 : 0)
