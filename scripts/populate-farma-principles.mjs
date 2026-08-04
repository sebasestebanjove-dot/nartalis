// NARTALIS - SEO FASE 2A.1 - POBLACIÓN DE farma_principles
// Fuente: pa_cache (dato ya ingerido en minúsculas desde CIMA: raw.vtm?.nombre || raw.pactivos, ver ingestPaCache).
// NO consulta CIMA en runtime (0 llamadas adicionales).
// Idempotente: re-ejecución segura.
// CLI: node scripts/populate-farma-principles.mjs  [--dry-run]

import { neon } from '@neondatabase/serverless'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizedKey, slugifyPrincipio, capitalizeName, classify } from '../src/lib/pa-normalize.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}
const DRY = process.argv.includes('--dry-run')
const sql = neon(process.env.DATABASE_URL)

// ── Lectura pa_cache ──────────────────────────────────────────────────
const rows = await sql`SELECT principio, nregistro, updated_at FROM pa_cache`
console.log(`pa_cache filas leídas: ${rows.length}`)

// Agrupar por normalized_key
const byKey = new Map() // key -> { variants:Set, nregistros:Set, last:Date }
for (const r of rows) {
  if (!r.principio) continue
  const key = normalizedKey(r.principio)
  if (!key) continue
  if (!byKey.has(key)) byKey.set(key, { variants: new Set(), nregistros: new Set(), last: r.updated_at })
  const g = byKey.get(key)
  g.variants.add(r.principio)
  g.nregistros.add(r.nregistro)
  if (r.updated_at && r.updated_at > g.last) g.last = r.updated_at
}

// Clasificar cada variante; la entidad hereda el tipo del representante (el de más nregistros, evitando compuesto si hay simple).
function repType(variants) {
  const seen = new Set()
  const simple = [], comp = [], basura = []
  for (const v of variants) {
    const t = classify(v)
    if (!seen.has(t)) seen.add(t)
    if (t === 'simple') simple.push(v)
    else if (t === 'compuesto') comp.push(v)
    else basura.push(v)
  }
  if (simple.length) return ['simple', simple[0]]
  if (comp.length) return ['compuesto', comp[0]]
  return ['valor_basura', basura[0] || [...variants][0]]
}

// Construir entidades
const entities = []
const usedSlugs = new Set()
for (const [key, g] of byKey) {
  const [tipo, repName] = repType(g.variants)
  let slug = slugifyPrincipio(repName) || 'pa-' + key.slice(0, 40)
  // Resolver colisión de slug con sufijo numérico
  let base = slug, i = 2
  while (usedSlugs.has(slug)) slug = `${base}-${i++}`
  usedSlugs.add(slug)
  const medicine_count = g.nregistros.size
  const active = tipo === 'simple' && medicine_count >= 3
  entities.push({
    key,
    tipo,
    repName,
    slug,
    canonical: capitalizeName(repName),
    primary: repName,
    variants: [...g.variants],
    nregistros: g.nregistros,
    medicine_count,
    active,
    first: g.last,
    last: g.last,
  })
}

console.log(`entidades a crear: ${entities.length}`)
console.log(`simples: ${entities.filter(e => e.tipo === 'simple').length} | compuestos: ${entities.filter(e => e.tipo === 'compuesto').length} | basura: ${entities.filter(e => e.tipo === 'valor_basura').length}`)

// ── Inserción ─────────────────────────────────────────────────────────
let created = 0, updated = 0
const idByKey = new Map()

if (!DRY) {
  for (const e of entities) {
    const res = await sql`
      INSERT INTO farma_principles
        (principio_original, nombre_canonico, slug, normalized_key, tipo, origen, active, medicine_count, first_seen, last_seen)
      VALUES
        (${e.primary}, ${e.canonical}, ${e.slug}, ${e.key}, ${e.tipo}, 'pa_cache', ${e.active}, ${e.medicine_count}, ${e.first ?? new Date()}, ${e.last ?? new Date()})
      ON CONFLICT (slug) DO UPDATE SET
        nombre_canonico = EXCLUDED.nombre_canonico,
        normalized_key = EXCLUDED.normalized_key,
        tipo = EXCLUDED.tipo,
        active = EXCLUDED.active,
        medicine_count = EXCLUDED.medicine_count,
        last_seen = EXCLUDED.last_seen
      RETURNING id, (xmax = 0) AS inserted
    `
    const row = res[0]
    idByKey.set(e.key, row.id)
    if (row.inserted) created++
    else updated++
  }
  console.log(`entity insert: created=${created} updated=${updated}`)

  // Asociar pa_cache.pa_principle_id (batch eficiente con UPDATE+VALUES)
  const unlinked = await sql`SELECT principio, nregistro FROM pa_cache WHERE pa_principle_id IS NULL`
  const staging = []
  for (const r of unlinked) {
    if (!r.principio) continue
    const key = normalizedKey(r.principio)
    const id = idByKey.get(key)
    if (id) staging.push([r.principio, r.nregistro, id])
  }
  const BATCH = 5000
  for (let i = 0; i < staging.length; i += BATCH) {
    const chunk = staging.slice(i, i + BATCH)
    const ph = []
    const params = []
    for (let k = 0; k < chunk.length; k++) {
      ph.push(`($${params.length + 1}::text,$${params.length + 2}::text,$${params.length + 3}::bigint)`)
      params.push(chunk[k][0], chunk[k][1], chunk[k][2])
    }
    await sql.query(
      `UPDATE pa_cache pc SET pa_principle_id = v.id
       FROM (VALUES ${ph.join(',')}) AS v(principio, nregistro, id)
       WHERE pc.principio = v.principio AND pc.nregistro = v.nregistro AND pc.pa_principle_id IS NULL`,
      params
    )
  }
  console.log(`pa_cache vinculadas: ${staging.length} (sobre ${unlinked.length} sin vincular)`)
} else {
  console.log('[DRY-RUN] sin cambios en BD')
}

// ── Informe resumen ───────────────────────────────────────────────────
const s = entities.filter(e => e.tipo === 'simple')
const c = entities.filter(e => e.tipo === 'compuesto')
const b = entities.filter(e => e.tipo === 'valor_basura')
console.log('\n=== RESUMEN POBLACIÓN ===')
console.log('total entidades:', entities.length)
console.log('simples:', s.length)
console.log('compuestos:', c.length)
console.log('basura:', b.length)
console.log('active=true:', entities.filter(e => e.active).length)
console.log('active=false:', entities.filter(e => !e.active).length)
console.log('medicine_count>=3:', entities.filter(e => e.medicine_count >= 3).length)
console.log('medicine_count<3:', entities.filter(e => e.medicine_count < 3).length)

// Colisiones: mismo normalized_key distinto rep
console.log('\n=== GRUPOS CON VARIANTES MÚLTIPLES ===')
const multi = entities.filter(e => e.variants.length > 1)
console.log('grupos con >1 variante:', multi.length)
for (const e of multi.slice(0, 10)) {
  console.log(`  slug=${e.slug} key=${e.key} variantes=${e.variants.join(' | ')}`)
}

process.exit(0)