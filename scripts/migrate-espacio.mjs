import { neon } from '@neondatabase/serverless'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL no configurada')
  process.exit(1)
}

const sql = neon(url)
const file = join(__dirname, '..', 'migrations', 'nartalis_espacio.sql')
const ddl = readFileSync(file, 'utf8')

const statements = ddl
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.toUpperCase().startsWith('BEGIN') && !s.toUpperCase().startsWith('COMMIT'))

for (const stmt of statements) {
  await sql.query(stmt)
  console.log('OK:', stmt.slice(0, 60).replace(/\s+/g, ' ') + '...')
}

const tabs = await sql.query(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('nartalis_user_medicamentos', 'nartalis_user_consultas')
  ORDER BY tablename
`)
console.log('Tablas tras migración:', tabs.map(r => r.tablename).join(', '))

const idxs = await sql.query(`
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN ('idx_user_med_user', 'idx_user_med_fav', 'idx_user_cons_user_date')
  ORDER BY indexname
`)
console.log('Índices:', idxs.map(r => r.indexname).join(', '))

console.log('Migración nartalis_espacio aplicada OK')
