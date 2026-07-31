import { neon } from '@neondatabase/serverless'
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
const sql = neon(process.env.DATABASE_URL)

console.log('── Tabla nartalis_users ─────────────────────────')
const exists = await sql`SELECT to_regclass('nartalis_users') AS t`
console.log('existe:', exists[0]?.t === 'nartalis_users' ? 'SÍ' : 'NO')

const cols = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'nartalis_users'
  ORDER BY ordinal_position
`
const required = ['id', 'email', 'name', 'avatar_url', 'primary_provider', 'google_id', 'apple_sub', 'password_hash', 'status', 'plan', 'role', 'email_verified', 'created_at', 'updated_at', 'last_login_at']
let ok = true
for (const r of required) {
  const c = cols.find(x => x.column_name === r)
  const present = !!c
  if (!present) ok = false
  console.log(`  ${present ? '✅' : '❌'} ${r} ${c ? `(${c.data_type}${c.is_nullable === 'NO' ? ', NOT NULL' : ''})` : 'FALTA'}${r === 'id' && c?.column_default?.includes('gen_random_uuid') ? ' [PK]' : ''}${r === 'email' && c?.is_nullable === 'NO' ? ' [UNIQUE? ver índices]' : ''}`)
}

const uniqueEmail = await sql`
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'nartalis_users' AND indexname = 'idx_nartalis_users_email'
`
const uniqueGoogle = await sql`
  SELECT indexdef FROM pg_indexes
  WHERE tablename = 'nartalis_users' AND indexname = 'idx_nartalis_users_google_id'
`
const uniqueApple = await sql`
  SELECT indexdef FROM pg_indexes
  WHERE tablename = 'nartalis_users' AND indexname = 'idx_nartalis_users_apple_sub'
`

console.log('\n── Índices únicos ────────────────────────────────')
console.log('  email (UNIQUE):', uniqueEmail.length ? 'SÍ' : 'NO')
console.log('  google_id parcial:', uniqueGoogle[0] ? `SÍ — ${uniqueGoogle[0].indexdef}` : 'NO')
console.log('  apple_sub parcial:', uniqueApple[0] ? `SÍ — ${uniqueApple[0].indexdef}` : 'NO')
console.log('  to_regclass:', exists[0]?.t ?? 'null')

console.log('\nResultado verificación:', ok ? 'OK' : 'ERROR')
process.exit(ok ? 0 : 1)
