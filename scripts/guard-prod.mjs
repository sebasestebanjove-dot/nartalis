// Guard de seguridad: impide que las suites de test se ejecuten contra hosts
// remotos (producción, previews, etc.) salvo autorización explícita con --prod.
//
// Uso:
//   import { parseBase, assertNotProd } from './guard-prod.mjs'
//   const { base: BASE, prod: PROD } = parseBase()
//   assertNotProd(BASE, PROD)
//
// Reglas:
//   - localhost / 127.0.0.1 / ::1 (con o sin puerto y protocolo) → permitido.
//   - Cualquier otro host (p.ej. https://nartalis.com) → ABORTA sin hacer requests.
//   - Solo con el flag --prod se permite un host remoto.

const LOCAL_RE = /^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|\[?::1\]?)(?::\d+)?(?:\/|$)/i

export function parseBase(argv = process.argv.slice(2)) {
  const prod = argv.includes('--prod')
  const rest = argv.filter((a) => a !== '--prod')
  const base = rest[0] || 'http://localhost:3000'
  return { base, prod }
}

export function assertNotProd(base, prod) {
  if (LOCAL_RE.test(String(base).trim())) return
  if (prod) return
  console.error('❌ Refusing to run tests against production. Use --prod explicitly if this is intentional.')
  console.error(`   Base recibida: ${base}`)
  process.exit(1)
}
