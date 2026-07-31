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
const file = join(__dirname, '..', 'migrations', 'nartalis_users.sql')
const ddl = readFileSync(file, 'utf8')

const statements = ddl
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.toUpperCase().startsWith('BEGIN') && !s.toUpperCase().startsWith('COMMIT'))

for (const stmt of statements) {
  await sql.query(stmt)
  console.log('OK:', stmt.slice(0, 60).replace(/\s+/g, ' ') + '...')
}
console.log('Migración nartalis_users aplicada OK')
