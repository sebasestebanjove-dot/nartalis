// Auditoría funcional FASE 2 — cuenta central Nartalis
// Uso: node scripts/test-auth.mjs [baseUrl]
const BASE = process.argv[2] || 'http://localhost:3000'

let passed = 0
let failed = 0
const results = []

function check(name, cond, extra = '') {
  if (cond) { passed++; results.push(`  ✅ ${name}`) }
  else { failed++; results.push(`  ❌ ${name} ${extra}`) }
}

const jar = new Map()
async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
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

function withAuth(opts = {}, extraCookies = {}) {
  const cookies = [...jar.entries()].map(([k, v]) => `${k}=${v}`)
  for (const [k, v] of Object.entries(extraCookies)) cookies.push(`${k}=${v}`)
  const headers = { ...(opts.headers || {}), Cookie: cookies.join('; ') }
  return { ...opts, headers }
}

const email = `audit.fase2.${Date.now()}@example.com`
const password = 'ClaveSegura123!'

console.log(`Base: ${BASE}`)
console.log(`Email de prueba: ${email}`)
console.log(`\n${'─'.repeat(56)}\n`)

// ═══ T01 / T02 — Páginas públicas ═══
let r = await req('/registro')
check('T01 GET /registro → 200', r.status === 200)
check('   título "Crea tu espacio personal"', r.text.includes('Crea tu espacio personal'))
check('   subtítulo exacto', r.text.includes('Guarda tus medicamentos, organiza tu botiquín y ten tu información siempre contigo.'))
check('   botón "Continuar con Google"', r.text.includes('Continuar con Google'))
check('   botón "Continuar con Apple"', r.text.includes('Continuar con Apple'))
check('   separador "o con tu correo"', r.text.includes('o con tu correo'))
check('   CTA "Crear mi espacio gratis"', r.text.includes('Crear mi espacio gratis'))

r = await req('/login')
check('T02 GET /login → 200', r.status === 200)
check('   título "Bienvenido de nuevo"', r.text.includes('Bienvenido de nuevo'))
check('   CTA "Iniciar sesión"', r.text.includes('Iniciar sesión'))
check('   NO hay "¿Has olvidado tu contraseña?"', !r.text.includes('¿Has olvidado tu contraseña?'))
check('   enlaces legales correctos (sin /legal/)', r.text.includes('/terminos-y-condiciones') && r.text.includes('/politica-de-privacidad') && !r.text.includes('/legal/'))

// ═══ T08 — Validaciones + email duplicado ═══
r = await req('/api/auth/register', { method: 'POST', json: { name: '', email, password } })
check('register sin nombre → 400', r.status === 400)

r = await req('/api/auth/register', { method: 'POST', json: { name: 'X', email: 'mal', password } })
check('register email inválido → 400', r.status === 400)

r = await req('/api/auth/register', { method: 'POST', json: { name: 'X', email, password: 'corta' } })
check('register password corto → 400', r.status === 400)

// ═══ T03 — Registro válido ═══
r = await req('/api/auth/register', { method: 'POST', json: { name: 'Auditor', email, password } })
check('T03 POST /api/auth/register válido → 200', r.status === 200 && r.data?.ok === true)
check('   cookie nartalis_session establecida', jar.has('nartalis_session'))
check('   cookie NO accesible desde JS: HttpOnly', (() => { const c = r.res.headers.get('set-cookie') || ''; return /HttpOnly/i.test(c) })())

// Verificar plan/role/status en BD
{
  const { neon } = await import('@neondatabase/serverless')
  const { readFileSync, existsSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const envPath = join(__dirname, '..', '.env.local')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] = m[2]
    }
  }
  const sql = neon(process.env.DATABASE_URL)
  const rows = await sql`SELECT email, plan, role, status, primary_provider, password_hash FROM nartalis_users WHERE email = ${email}`
  check('   usuario en BD con plan=FREE', rows[0]?.plan === 'FREE')
  check('   usuario en BD con role=USER', rows[0]?.role === 'USER')
  check('   usuario en BD con status=ACTIVE', rows[0]?.status === 'ACTIVE')
  check('   primary_provider=email', rows[0]?.primary_provider === 'email')
  check('   password almacenada como hash scrypt (sal:hash 32:128)', (() => { const h = rows[0]?.password_hash || ''; const [s, k] = h.split(':'); return s?.length === 32 && k?.length === 128 })())
}

// ═══ T08b — Email duplicado ═══
r = await req('/api/auth/register', { method: 'POST', json: { name: 'Auditor', email, password } })
check('T08 email duplicado → 409', r.status === 409)
check('   mensaje "Ya existe una cuenta con este correo."', r.data?.error === 'Ya existe una cuenta con este correo.')

// ═══ T04 — Sesión autenticada + sin info sensible ═══
r = await req('/api/auth/session', withAuth())
check('T04 GET /api/auth/session → authenticated=true', r.status === 200 && r.data?.authenticated === true && r.data?.user?.email === email)
check('   plan FREE en sesión', r.data?.user?.plan === 'FREE')
const sessionRaw = r.text
check('   sin password_hash en respuesta', !sessionRaw.includes('password_hash'))
check('   sin secret/token en respuesta', !sessionRaw.includes('NEXTAUTH_SECRET') && !sessionRaw.includes('google_client_secret') && !sessionRaw.includes('apple_private_key'))

// ═══ T05 — Recarga del navegador (misma cookie, nueva petición) ═══
r = await req('/api/auth/session', withAuth())
check('T05 recarga: sesión continúa activa', r.data?.authenticated === true && r.data?.user?.email === email)

// ═══ T10 / T11 / T12 — /espacio y páginas con sesión ═══
r = await req('/espacio?welcome=1', withAuth())
check('T10 GET /espacio?welcome=1 (primera llegada) → 200', r.status === 200)
check('   copy "Tu espacio personal está listo"', r.text.includes('Tu espacio personal está listo') && r.text.includes('Hemos creado tu cuenta Nartalis.'))
check('   Plan Free + "se está preparando"', r.text.includes('Plan Free') && r.text.includes('Tu espacio personal se está preparando.'))
check('   botón "Volver al inicio"', r.text.includes('Volver al inicio'))
check('   botón "Cerrar sesión"', r.text.includes('Cerrar sesión'))

// ═══ T17 / T18 — Home anónima vs autenticada (indicador de cuenta) ═══
r = await req('/')
check('T17 Home anónima: sin indicador de cuenta', !r.text.includes('>Mi espacio<') && !r.text.includes('Entrar en mi espacio') && !r.text.includes('Hola,'))
check('   Home anónima: CTA "Crear mi espacio gratis"', r.text.includes('Crear mi espacio gratis'))
r = await req('/', withAuth())
check('T18 Home con sesión: "Hola, Auditor"', r.text.includes('Hola, Auditor'))
check('   CTA "Mi espacio" enlaza a /espacio', r.text.includes('href="/espacio"') && r.text.includes('>Mi espacio<'))
check('   tarjeta CTA "Entrar en mi espacio"', r.text.includes('Entrar en mi espacio'))

r = await req('/registro', withAuth())
check('T11 GET /registro con sesión → 307 → /espacio', r.status === 307 && (r.res.headers.get('location') || '').includes('/espacio'))

r = await req('/login', withAuth())
check('T12 GET /login con sesión → 307 → /espacio', r.status === 307 && (r.res.headers.get('location') || '').includes('/espacio'))

// ═══ T06 — Login correcto (tras logout) ═══
r = await req('/api/auth/logout', withAuth({ method: 'POST' }))
check('logout previo OK', r.status === 200)

r = await req('/api/auth/login', { method: 'POST', json: { email, password } })
check('T06 POST /api/auth/login válido → 200', r.status === 200 && r.data?.ok === true)
check('   cookie nartalis_session establecida', jar.has('nartalis_session'))

// ═══ T07 — Login incorrecto ═══
r = await req('/api/auth/login', { method: 'POST', json: { email, password: 'ClaveErronea!' } })
check('T07 login password incorrecto → 401', r.status === 401)
check('   mensaje "Credenciales inválidas."', r.data?.error === 'Credenciales inválidas.')

// Login con email inexistente → mismo mensaje (no revela si existe)
r = await req('/api/auth/login', { method: 'POST', json: { email: 'noexiste@example.com', password: 'ClaveErronea!' } })
check('   login email inexistente → 401 (mismo mensaje)', r.status === 401 && r.data?.error === 'Credenciales inválidas.')

// ═══ T19 — /espacio entrada normal tras login (sin ?welcome=1) ═══
r = await req('/espacio', withAuth())
check('T19 GET /espacio tras login → 200', r.status === 200)
check('   copy "Hola, Auditor" + "Este es tu espacio personal"', r.text.includes('Hola, Auditor') && r.text.includes('Este es tu espacio personal Nartalis.'))
check('   NO muestra "Hemos creado tu cuenta"', !r.text.includes('Hemos creado tu cuenta Nartalis.'))

// ═══ T13 / T14 — Logout + sesión destruida ═══
r = await req('/api/auth/logout', withAuth({ method: 'POST' }, { dermo_session: 'x', ia_module_session: 'y' }))
check('T13 POST /api/auth/logout → 200', r.status === 200)
check('   solo destruye nartalis_session', r.setCookieNames.every(n => n === 'nartalis_session'))
check('   nartalis_session marcada para eliminar (max-age=0)', (() => { const c = r.res.headers.get('set-cookie') || ''; return /max-age=0/i.test(c) })())
check('   NO toca dermo_session ni ia_module_session', !r.setCookieNames.includes('dermo_session') && !r.setCookieNames.includes('ia_module_session'))

r = await req('/api/auth/session', withAuth())
check('   sesión tras logout → authenticated=false', r.data?.authenticated === false)

r = await req('/espacio', withAuth())
check('T14 GET /espacio tras logout → 307 → /registro', r.status === 307 && (r.res.headers.get('location') || '').includes('/registro'))

// ═══ T09 — /espacio sin sesión ═══
r = await req('/espacio')
check('T09 GET /espacio sin sesión → 307 → /registro', r.status === 307 && (r.res.headers.get('location') || '').includes('/registro'))

// ═══ T15 — Google wiring ═══
r = await req('/api/auth/google')
const gloc = r.res.headers.get('location') || ''
check('T15 GET /api/auth/google → redirect a accounts.google.com', r.status >= 300 && r.status < 400 && gloc.includes('accounts.google.com/o/oauth2/v2/auth'))
check('   incluye client_id, redirect_uri y scope', gloc.includes('client_id=') && gloc.includes('redirect_uri=') && gloc.includes('scope=email') && gloc.includes('%2Fapi%2Fauth%2Fcallback%2Fgoogle'))
check('   callback route responde (sin code → redirect error)', (async () => { const cb = await req('/api/auth/callback/google'); return cb.status >= 300 && cb.status < 400 && (cb.res.headers.get('location') || '').includes('auth=error') })().catch(() => false))

// ═══ T16 — Apple UX ═══
r = await req('/api/auth/apple')
check('T16 GET /api/auth/apple → 200', r.status === 200)
check('   message exacto "Apple estará disponible próximamente."', r.data?.message === 'Apple estará disponible próximamente.')
check('   disponible=false (sin simulación)', r.data?.available === false)
check('   NO devuelve 501', r.status !== 501)

// ═══ T21 — Analítica sin PII (revisión estática) ═══
{
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const flowSrc = readFileSync(join(__dirname, '..', 'src', 'components', 'auth', 'AuthFlow.tsx'), 'utf8')
  check('T21 analítica AuthFlow sin PII', !/(track\([^)]*\{\s*(?:email|name)\s*:)/.test(flowSrc))
  const searchSrc = readFileSync(join(__dirname, '..', 'src', 'components', 'farma', 'screens', 'SearchScreen.tsx'), 'utf8')
  check('   account_space_click sin PII', searchSrc.includes("track('account_space_click')") && !searchSrc.includes("track('account_space_click',"))
}

// ═══ Home — CTA (anónima tras logout) ═══
r = await req('/')
check('Home → 200', r.status === 200)
check('   CTA "Crear mi espacio gratis" presente', r.text.includes('Crear mi espacio gratis'))
check('   sin indicador de cuenta tras logout', !r.text.includes('>Mi espacio<') && !r.text.includes('Entrar en mi espacio') && !r.text.includes('Hola,'))

// ═══ Regresión (no FASE 2) ═══
for (const p of ['/medicamentos', '/terminos-y-condiciones', '/politica-de-privacidad', '/aviso-legal', '/preguntas-frecuentes', '/dermo']) {
  r = await req(p)
  check(`Regresión GET ${p} → 200`, r.status === 200)
}
r = await req('/api/farma/search?q=paracetamol')
check('Regresión buscador /api/farma/search → 200 con resultados', r.status === 200 && r.data?.resultados)
r = await req('/api/farma/stats')
check('Regresión /api/farma/stats → 200', r.status === 200)

// ═══ TEST 6 / 7 / 8 — Saludo con primer nombre (FASE 2.1) ═══
{
  const { neon } = await import('@neondatabase/serverless')
  const { readFileSync, existsSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const envPath = join(__dirname, '..', '.env.local')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] = m[2]
    }
  }
  const sql = neon(process.env.DATABASE_URL)

  const gEmail = `audit.fase2.greeting.${Date.now()}@example.com`
  const gPass = 'ClaveSegura123!'

  r = await req('/api/auth/register', { method: 'POST', json: { name: 'SEBASTIAN ESTEBAN JOVE', email: gEmail, password: gPass } })
  check('   registro usuario "SEBASTIAN ESTEBAN JOVE"', r.status === 200 && r.data?.ok === true)

  r = await req('/', withAuth())
  check('TEST 6 "SEBASTIAN ESTEBAN JOVE" → "Hola, Sebastian"', r.text.includes('Hola, Sebastian'))
  check('   saludo no muestra "Hola, SEBASTIAN"', !r.text.includes('Hola, SEBASTIAN'))

  await sql`UPDATE nartalis_users SET name = 'Sebastián Esteban Jove' WHERE email = ${gEmail}`
  r = await req('/', withAuth())
  check('TEST 7 "Sebastián Esteban Jove" → "Hola, Sebastián"', r.text.includes('Hola, Sebastián'))
  check('   saludo no muestra el apellido', !r.text.includes('Hola, Sebastián Esteban'))

  await sql`UPDATE nartalis_users SET name = '' WHERE email = ${gEmail}`
  r = await req('/', withAuth())
  check('TEST 8 nombre vacío → "Mi cuenta"', r.text.includes('Mi cuenta'))
  check('   NO muestra "Hola, "', !r.text.includes('Hola,'))
}

console.log(`\n${'─'.repeat(56)}`)
console.log(`Resultado: ${passed} pasadas, ${failed} fallidas`)
console.log(results.join('\n'))
process.exit(failed > 0 ? 1 : 0)