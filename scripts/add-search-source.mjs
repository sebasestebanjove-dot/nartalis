// Nartalis — Migración aditiva y reversible: origen de la búsqueda en farma_search_log.
// Añade:
//   source       TEXT NOT NULL DEFAULT 'home'  ('home' | 'medicine_page')
//   source_page  TEXT NULL                     (ruta desde la que se buscó, p.ej. /prospectos/<slug>)
// Compatible: ADD COLUMN con DEFAULT es metadata-only (sin rewrite), filas históricas quedan 'home'.
// Reversible: ALTER TABLE farma_search_log DROP COLUMN source_page, DROP COLUMN source;
// Uso: node scripts/add-search-source.mjs
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

console.log('─'.repeat(56));
console.log('add-search-source: columnas source / source_page en farma_search_log');
console.log('─'.repeat(56));

const before = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'farma_search_log' AND column_name IN ('source', 'source_page')
`;
if (before.length >= 2) {
  console.log('✓ Las columnas ya existen. Nada que hacer.');
  process.exit(0);
}

await sql`ALTER TABLE farma_search_log ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'home'`;
await sql`ALTER TABLE farma_search_log ADD COLUMN IF NOT EXISTS source_page TEXT`;

const after = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'farma_search_log' AND column_name IN ('source', 'source_page')
  ORDER BY column_name
`;
for (const c of after) {
  console.log(`✓ ${c.column_name} ${c.data_type} nullable=${c.is_nullable} default=${c.column_default ?? '—'}`);
}
if (after.length !== 2) {
  console.error('✖ Verificación fallida: no se crearon las dos columnas.');
  process.exit(1);
}
console.log('✓ Migración completada. Filas históricas conservan source=home por defecto.');
