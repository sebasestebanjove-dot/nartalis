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
const deleted = await sql`DELETE FROM nartalis_users WHERE email LIKE 'test.fase2.%@example.com' OR email LIKE 'audit.fase2.%@example.com' RETURNING email`
console.log(`Usuarios de prueba eliminados: ${deleted.length}`)
const rest = await sql`SELECT count(*)::int AS n FROM nartalis_users`
console.log(`Usuarios nartalis restantes: ${rest[0].n}`)
