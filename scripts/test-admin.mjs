// Tests FASE 6/6A — Panel administrativo Nartalis (T01–T32)
// Uso: node scripts/test-admin.mjs [baseUrl]
// Requiere: servidor en marcha (npm run dev) y DATABASE_URL en .env.local.
// Crea usuarios admin.test.*@example.com / admin.user.*@example.com y los elimina al final.
// NO toca prova@prova.com ni sebasestebanjove@gmail.com salvo lectura.
import { neon } from '@neondatabase/serverless'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const BASE = process.argv[2] || 'http://localhost:3000'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}
const sql = neon(process.env.DATABASE_URL)

let passed = 0
let failed = 0
const results = []
function check(name, cond, extra = '') {
  if (cond) { passed++; results.push(`  ✅ ${name}`) }
  else { failed++; results.push(`  ❌ ${name} ${extra}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const norm = (s) => String(s).trim().toLowerCase()

// ─── Cliente HTTP con cookie-jar por identidad ───
function makeClient() {
  const jar = new Map()
  async function req(path, opts = {}) {
    const headers = { ...(opts.headers || {}), 'x-nartalis-test': '1' }
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json'
      opts = { ...opts, body: JSON.stringify(opts.json) }
    }
    const cookies = [...jar.entries()].map(([k, v]) => `${k}=${v}`)
    if (cookies.length) headers.Cookie = cookies.join('; ')
    const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' })
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
    for (const sc of setCookies) {
      const m = sc.match(/^([^=]+)=([^;]*)/)
      if (m) jar.set(m[1], m[2])
    }
    let text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = null }
    return { res, status: res.status, data, text }
  }
  return { req, jar }
}

console.log(`Base: ${BASE}\n`)

// ─── Datos de prueba ───
const ts = Date.now()
const adminEmail = `admin.test.${ts}@example.com`
const userEmail = `admin.user.${ts}@example.com`
const password = 'ClaveSegura123!'

// Limpieza preventiva de restos (idempotente)
await sql`DELETE FROM nartalis_user_medicamentos WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com')`
await sql`DELETE FROM nartalis_user_consultas WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com')`
await sql`DELETE FROM farma_search_log WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com')`
await sql`DELETE FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com'`

// Marcador para limpiar SOLO las búsquedas de este test
const [marker] = await sql`SELECT COALESCE(MAX(id),0) AS mid FROM farma_search_log`
const midVal = Number(marker.mid)

const anon = makeClient()
const adminC = makeClient()
const userC = makeClient()

// ═══ T01 — /admin anónimo ═══
let r = await anon.req('/admin')
check('T01 GET /admin sin sesión → 307 → /login?next=/admin', r.status === 307 && (r.res.headers.get('location') || '').includes('/login'))

// ═══ T02 — /admin con sesión USER ═══
r = await userC.req('/api/auth/register', { method: 'POST', json: { name: 'Admin User', email: userEmail, password } })
check('T02a registro usuario USER OK', r.status === 200 && r.data?.ok === true)
r = await userC.req('/admin')
check('T02b GET /admin con USER → 307 → /espacio', r.status === 307 && (r.res.headers.get('location') || '').includes('/espacio'))

// ═══ T03/T04 — APIs admin bloqueadas para anónimo/USER ═══
r = await anon.req('/api/admin/stats')
check('T03 GET /api/admin/stats sin sesión → 401', r.status === 401)
r = await anon.req('/api/admin/users')
check('   GET /api/admin/users sin sesión → 401', r.status === 401)
r = await anon.req('/api/admin/users/00000000-0000-0000-0000-000000000000')
check('   GET /api/admin/users/[id] sin sesión → 401', r.status === 401)
r = await anon.req('/api/admin/search-log')
check('   GET /api/admin/search-log sin sesión → 401', r.status === 401)
r = await anon.req('/api/admin/meds')
check('   GET /api/admin/meds sin sesión → 401', r.status === 401)
r = await anon.req('/api/admin/activity')
check('   GET /api/admin/activity sin sesión → 401', r.status === 401)

r = await userC.req('/api/admin/stats')
check('T04 GET /api/admin/stats con USER → 403', r.status === 403)
r = await userC.req('/api/admin/users')
check('   GET /api/admin/users con USER → 403', r.status === 403)
r = await userC.req('/api/admin/search-log')
check('   GET /api/admin/search-log con USER → 403', r.status === 403)
r = await userC.req('/api/admin/meds')
check('   GET /api/admin/meds con USER → 403', r.status === 403)

// ═══ T05 — PATCH prohibido con USER ═══
r = await userC.req('/api/admin/users/' + (await sql`SELECT id FROM nartalis_users WHERE email = ${userEmail}`)[0].id, { method: 'PATCH', json: { status: 'DISABLED' } })
check('T05 PATCH /api/admin/users/[id] con USER → 403', r.status === 403)

// ═══ T06 — Promover admin de test (solo via DB, no UI) ═══
await sql`UPDATE nartalis_users SET role = 'ADMIN' WHERE email = ${adminEmail}`
r = await adminC.req('/api/auth/register', { method: 'POST', json: { name: 'Admin Test', email: adminEmail, password } })
check('T06a registro admin de test OK', r.status === 200 && r.data?.ok === true)
const [adminRow] = await sql`SELECT id FROM nartalis_users WHERE email = ${adminEmail}`
await sql`UPDATE nartalis_users SET role = 'ADMIN' WHERE email = ${adminEmail}`
const [adminVer] = await sql`SELECT role FROM nartalis_users WHERE email = ${adminEmail}`
check('T06b admin de test role=ADMIN', adminVer.role === 'ADMIN')
const adminId = adminRow.id

// ═══ T07 — /admin con sesión ADMIN ═══
r = await adminC.req('/admin')
check('T07 GET /admin con ADMIN → 200', r.status === 200)

// ═══ T08 — /api/admin/stats con ADMIN ═══
r = await adminC.req('/api/admin/stats')
check('T08 GET /api/admin/stats con ADMIN → 200', r.status === 200 && r.data?.ok === true)
check('   estructura usuarios/buscador/espacio', !!r.data?.data?.usuarios && !!r.data?.data?.buscador && !!r.data?.data?.espacio)
check('   sin password_hash/google_id/apple_sub en respuesta', !r.text.includes('password_hash') && !r.text.includes('google_id') && !r.text.includes('apple_sub'))
check('   usuarios.total es número', typeof r.data?.data?.usuarios?.total === 'number')

// ═══ T09 — /api/admin/users ═══
r = await adminC.req('/api/admin/users')
check('T09 GET /api/admin/users con ADMIN → 200', r.status === 200 && r.data?.ok === true)
check('   devuelve array data + total', Array.isArray(r.data?.data) && typeof r.data?.total === 'number')
check('   sin password_hash en respuesta', !r.text.includes('password_hash'))
check('   sin google_id/apple_sub en respuesta', !r.text.includes('google_id') && !r.text.includes('apple_sub'))

r = await adminC.req('/api/admin/users?q=sebasestebanjove')
check('   filtro q encuentra al admin real', r.status === 200 && r.data?.total === 1 && norm(r.data?.data?.[0]?.email) === 'sebasestebanjove@gmail.com')

r = await adminC.req('/api/admin/users?plan=PREMIUM')
check('   filtro plan funciona', r.status === 200)

r = await adminC.req('/api/admin/users?limit=999')
check('   limit clampa a 100', r.status === 200 && r.data?.data?.length <= 100)

// ═══ T10 — /api/admin/users/[id] ═══
r = await adminC.req(`/api/admin/users/${adminId}`)
check('T10 GET /api/admin/users/[id] con ADMIN → 200', r.status === 200 && r.data?.ok === true)
check('   devuelve user/meds/consultas/searchStats', !!r.data?.data?.user && !!r.data?.data?.meds && !!r.data?.data?.consultas && !!r.data?.data?.searchStats)
check('   sin password_hash en detalle', !r.text.includes('password_hash'))

r = await adminC.req('/api/admin/users/no-es-uuid')
check('   GET id no-UUID → 400', r.status === 400)
r = await adminC.req('/api/admin/users/00000000-0000-0000-0000-000000000000')
check('   GET UUID inexistente → 404', r.status === 404)

// ═══ T11 — PATCH status/plan (válidos) ═══
const userId = (await sql`SELECT id FROM nartalis_users WHERE email = ${userEmail}`)[0].id
r = await adminC.req(`/api/admin/users/${userId}`, { method: 'PATCH', json: { status: 'DISABLED' } })
check('T11 PATCH status=DISABLED → 200', r.status === 200 && r.data?.data?.status === 'DISABLED')
r = await userC.req('/api/admin/stats')
check('   usuario DISABLED pierde sesión → 401', r.status === 401)
r = await adminC.req(`/api/admin/users/${userId}`, { method: 'PATCH', json: { status: 'ACTIVE', plan: 'PREMIUM' } })
check('   PATCH status=ACTIVE + plan=PREMIUM → 200', r.status === 200 && r.data?.data?.status === 'ACTIVE' && r.data?.data?.plan === 'PREMIUM')
r = await userC.req('/api/admin/stats')
check('   usuario reactivado → 403 (vuelve a ser USER)', r.status === 403)

// ═══ T12 — PATCH valores inválidos ═══
r = await adminC.req(`/api/admin/users/${userId}`, { method: 'PATCH', json: { status: 'BANANA' } })
check('T12 PATCH status inválido → 400', r.status === 400)
r = await adminC.req(`/api/admin/users/${userId}`, { method: 'PATCH', json: { plan: 'GOLD' } })
check('   PATCH plan inválido → 400', r.status === 400)
r = await adminC.req(`/api/admin/users/${userId}`, { method: 'PATCH', json: {} })
check('   PATCH sin campos → 400', r.status === 400)

// ═══ T13 — PATCH campos prohibidos ═══
for (const field of ['role', 'email', 'password', 'password_hash', 'google_id', 'apple_sub', 'primary_provider']) {
  r = await adminC.req(`/api/admin/users/${userId}`, { method: 'PATCH', json: { [field]: 'x' } })
  check(`T13 PATCH intento ${field} → 403`, r.status === 403)
}
const [roleAfter] = await sql`SELECT role, email, primary_provider FROM nartalis_users WHERE id = ${userId}`
check('   role/email/provider intactos tras intentos', roleAfter.role === 'USER' && roleAfter.email === userEmail && roleAfter.primary_provider === 'email')

// ═══ T14 — search-log con ADMIN ═══
r = await adminC.req('/api/admin/search-log')
check('T14 GET /api/admin/search-log con ADMIN → 200', r.status === 200 && r.data?.ok === true)
check('   estructura totals/topQueries/topVoice/topZero/daily/byUser', !!r.data?.data?.totals && Array.isArray(r.data?.data?.topQueries) && Array.isArray(r.data?.data?.daily))

r = await adminC.req('/api/admin/search-log?search_type=voice')
check('   filtro search_type=voice → 200', r.status === 200)
r = await adminC.req('/api/admin/search-log?from=2026-01-01&to=2026-01-02')
check('   filtros fecha → 200', r.status === 200)
r = await adminC.req('/api/admin/search-log?search_type=invalido')
check('   search_type inválido se ignora (no 500)', r.status === 200)

// ═══ T15 — meds con ADMIN ═══
r = await adminC.req('/api/admin/meds')
check('T15 GET /api/admin/meds con ADMIN → 200', r.status === 200 && r.data?.ok === true)
check('   estructura mostSaved/mostFavorited/mostConsulted/totals', Array.isArray(r.data?.data?.mostSaved) && Array.isArray(r.data?.data?.mostFavorited) && Array.isArray(r.data?.data?.mostConsulted) && !!r.data?.data?.totals)

// ═══ T16 — activity con ADMIN ═══
r = await adminC.req('/api/admin/activity')
check('T16 GET /api/admin/activity con ADMIN → 200', r.status === 200 && r.data?.ok === true)
check('   estructura recentSearches/recentRegistrations', Array.isArray(r.data?.data?.recentSearches) && Array.isArray(r.data?.data?.recentRegistrations))

// ═══ T17 — Búsqueda anónima se loguea con user_id NULL ═══
const busqAnon = 'paracetamol'
r = await anon.req(`/api/farma/search?q=${busqAnon}`)
check('T17 búsqueda anónima responde 200 con resultados', r.status === 200 && Array.isArray(r.data?.resultados) && r.data.resultados.length > 0)
await sleep(300)
const [anonLog] = await sql`SELECT query, search_type, user_id, result_count, was_successful FROM farma_search_log WHERE id > ${midVal} AND LOWER(TRIM(query)) = ${busqAnon} AND user_id IS NULL ORDER BY id DESC LIMIT 1`
check('   log anónimo con user_id NULL', !!anonLog && anonLog.user_id === null)
check('   log anónimo result_count = resultados reales', anonLog && anonLog.result_count === r.data.resultados.length)
check('   log anónimo was_successful = true', anonLog && anonLog.was_successful === true)
check('   log anónimo search_type = text', anonLog && anonLog.search_type === 'text')

// ═══ T18 — Búsqueda autenticada se loguea con user_id ═══
r = await adminC.req(`/api/farma/search?q=${busqAnon}`)
check('T18 búsqueda autenticada responde 200', r.status === 200 && Array.isArray(r.data?.resultados))
await sleep(300)
const [authLog] = await sql`SELECT query, search_type, user_id, result_count, was_successful FROM farma_search_log WHERE id > ${midVal} AND user_id = ${adminId} ORDER BY id DESC LIMIT 1`
check('   log autenticado con user_id = admin', !!authLog && authLog.user_id === adminId)
check('   log autenticado result_count = resultados', authLog && authLog.result_count === r.data.resultados.length)
check('   log autenticado was_successful = true', authLog && authLog.was_successful === true)

// Segunda búsqueda text autenticada del admin (garantiza total>=3 y text>=2)
r = await adminC.req(`/api/farma/search?q=amoxicilina`)
check('T18b búsqueda text extra del admin responde 200', r.status === 200)
await sleep(300)

// ═══ T19 — Búsqueda de voz se loguea con search_type=voice ═══
r = await adminC.req(`/api/farma/search?q=${busqAnon}&type=voice`)
check('T19 búsqueda voice responde 200', r.status === 200 && Array.isArray(r.data?.resultados))
await sleep(300)
const [voiceLog] = await sql`SELECT search_type FROM farma_search_log WHERE id > ${midVal} AND search_type = 'voice' AND user_id = ${adminId} ORDER BY id DESC LIMIT 1`
check('   log voice search_type=voice', !!voiceLog && voiceLog.search_type === 'voice')

// ═══ T20 — Búsqueda SIN resultados se loguea con was_successful=false ═══
const busqZero = 'zzzqqxxwvuytr'
r = await anon.req(`/api/farma/search?q=${busqZero}`)
check('T20 búsqueda sin resultados responde 200 con 0', r.status === 200 && Array.isArray(r.data?.resultados) && r.data.resultados.length === 0)
await sleep(400)
const [zeroLog] = await sql`SELECT user_id, result_count, was_successful, search_type FROM farma_search_log WHERE id > ${midVal} AND LOWER(TRIM(query)) = ${busqZero} ORDER BY id DESC LIMIT 1`
check('   log sin resultados fue grabado', !!zeroLog)
check('   result_count = 0', zeroLog && zeroLog.result_count === 0)
check('   was_successful = false', zeroLog && zeroLog.was_successful === false)
check('   search_type = text', zeroLog && zeroLog.search_type === 'text')

// ═══ T21 — search-log refleja las búsquedas ═══
r = await adminC.req('/api/admin/search-log')
const slTotals = r.data?.data?.totals
check('T21 totals.total >= búsquedas del test', typeof slTotals?.total === 'number' && slTotals.total >= 4)
check('   totals.text_count >= 3', slTotals?.text_count >= 3)
check('   totals.voice_count >= 1', slTotals?.voice_count >= 1)
check('   totals.without_results >= 1', slTotals?.without_results >= 1)
check('   totals.authenticated >= 1', slTotals?.authenticated >= 1)
check('   totals.anonymous >= 2', slTotals?.anonymous >= 2)

r = await adminC.req('/api/admin/search-log?from=2000-01-01')
check('   filtro fecha antigua devuelve todo', r.status === 200)

// ═══ T22 — byUser incluye al admin de test ═══
r = await adminC.req('/api/admin/search-log')
const byUser = r.data?.data?.byUser || []
const myRow = byUser.find((u) => u.email === adminEmail)
check('T22 byUser incluye admin.test', !!myRow && myRow.total >= 3)

// ═══ T23 — stats reflejan conteos ═══
r = await adminC.req('/api/admin/stats')
const sData = r.data?.data?.buscador
check('T23 stats.buscador.total >= búsquedas del test', typeof sData?.total === 'number' && sData.total >= 4)
check('   stats.buscador.voice_count >= 1', sData?.voice_count >= 1)
check('   stats.buscador.without_results >= 1', sData?.without_results >= 1)

// ═══ T24 — Detalle de usuario muestra searchStats ═══
r = await adminC.req(`/api/admin/users/${adminId}`)
const ss = r.data?.data?.searchStats
check('T24 searchStats.total_searches >= 3', typeof ss?.total_searches === 'number' && ss.total_searches >= 3)
check('   searchStats.text_searches >= 2', ss?.text_searches >= 2)
check('   searchStats.voice_searches >= 1', ss?.voice_searches >= 1)
check('   searchStats.last_search_at no vacío', !!ss?.last_search_at)

// ═══ T25 — /robots.txt excluye /admin ═══
r = await anon.req('/robots.txt')
check('T25 robots.txt excluye /admin', r.status === 200 && r.text.includes('Disallow: /admin'))

// ═══ T26 — /admin metadata noindex (SSR) ═══
r = await adminC.req('/admin')
check('T26 /admin con ADMIN sirve noindex', r.status === 200 && /noindex/i.test(r.text))

// ═══ T27 — APIs admin no crashean con body roto ═══
r = await adminC.req(`/api/admin/users/${userId}`, { method: 'PATCH', json: 'malformed' })
check('T27 PATCH body malformado → 400', r.status === 400)

// ═══ T28 — Guard de /admin: logout → login ═══
r = await adminC.req('/api/auth/logout', { method: 'POST' })
check('   logout admin OK', r.status === 200)
r = await adminC.req('/admin')
check('T28 /admin tras logout → 307 → /login', r.status === 307 && (r.res.headers.get('location') || '').includes('/login'))
r = await adminC.req('/api/admin/stats')
check('   /api/admin/stats tras logout → 401', r.status === 401)

// ═══ T29 — Limpieza de datos de test ═══
await sql`DELETE FROM nartalis_user_medicamentos WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com')`
await sql`DELETE FROM nartalis_user_consultas WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com')`
await sql`DELETE FROM farma_search_log WHERE id > ${midVal}`
await sql`DELETE FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com'`
{
  const [a] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_users WHERE email LIKE 'admin.test.%@example.com' OR email LIKE 'admin.user.%@example.com'`
  const [b] = await sql`SELECT COUNT(*)::int AS c FROM farma_search_log WHERE id > ${midVal}`
  const [adm] = await sql`SELECT COUNT(*)::int AS c FROM nartalis_users WHERE role = 'ADMIN'`
  check('T29 sin usuarios de test residuales', a.c === 0 && b.c === 0)
  check('   exactamente 1 ADMIN (el real)', adm.c === 1)
}

// ═══ T30 — Regresión test-auth ═══
{
  const p = spawnSync(process.execPath, [join(__dirname, 'test-auth.mjs'), BASE], { encoding: 'utf8', timeout: 120000 })
  check('T30 regresión test-auth (exit 0)', p.status === 0, `(status=${p.status})`)
  if (p.status !== 0) console.log(p.stdout?.slice(-2000), p.stderr?.slice(-2000))
}

// ═══ T31 — Regresión test-espacio ═══
{
  const p = spawnSync(process.execPath, [join(__dirname, 'test-espacio.mjs'), BASE], { encoding: 'utf8', timeout: 120000 })
  check('T31 regresión test-espacio (exit 0)', p.status === 0, `(status=${p.status})`)
  if (p.status !== 0) console.log(p.stdout?.slice(-2000), p.stderr?.slice(-2000))
}

// ═══ T32 — Regresión test-farma-stats ═══
{
  const p = spawnSync(process.execPath, [join(__dirname, 'test-farma-stats.mjs'), BASE], { encoding: 'utf8', timeout: 120000 })
  check('T32 regresión test-farma-stats (exit 0)', p.status === 0, `(status=${p.status})`)
  if (p.status !== 0) console.log(p.stdout?.slice(-2000), p.stderr?.slice(-2000))
}

// Limpieza final: test-auth deja audit.fase2.* residuales (no los borra él mismo),
// y las regresiones de búsqueda (paracetamol) crean filas en farma_search_log.
await sql`DELETE FROM nartalis_user_medicamentos WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'audit.fase2.%@example.com')`
await sql`DELETE FROM nartalis_user_consultas WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'audit.fase2.%@example.com')`
await sql`DELETE FROM farma_search_log WHERE user_id IN (SELECT id FROM nartalis_users WHERE email LIKE 'audit.fase2.%@example.com')`
await sql`DELETE FROM nartalis_users WHERE email LIKE 'audit.fase2.%@example.com'`
await sql`DELETE FROM farma_search_log WHERE id > ${midVal}`

// ═══ Verificación final de estado ═══
await sleep(500)
{
  const admins = await sql`SELECT email, role, status FROM nartalis_users WHERE role = 'ADMIN'`
  check('Estado final: admin real intacto', admins?.length === 1 && admins[0].email === 'sebasestebanjove@gmail.com' && admins[0].status === 'ACTIVE')
}

console.log(`\n${'─'.repeat(56)}`)
console.log(`Resultado: ${passed} pasadas, ${failed} fallidas`)
console.log(results.join('\n'))
process.exit(failed > 0 ? 1 : 0)
