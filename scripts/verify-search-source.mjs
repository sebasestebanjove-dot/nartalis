// Nartalis — Verificación (solo lectura) del registro de origen de búsquedas.
// Uso: node scripts/verify-search-source.mjs [n]
import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const sql = neon(process.env.DATABASE_URL);
const limit = Number(process.argv[2] || 3);
const rows = await sql`
  SELECT query, source, source_page, result_count, was_successful, created_at::text
  FROM farma_search_log
  ORDER BY created_at DESC LIMIT ${limit}
`;
console.log(JSON.stringify(rows, null, 2));
