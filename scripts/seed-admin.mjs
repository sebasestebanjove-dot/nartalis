// Nartalis - FASE 6: Promoción controlada del ADMIN único.
// Uso: node scripts/seed-admin.mjs
// Promueve EXACTAMENTE a sebasestebanjove@gmail.com a role=ADMIN, status=ACTIVE.
// Seguro e idempotente: aborta si la cuenta no existe; no toca a ningún otro usuario.
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

const ADMIN_EMAIL = 'sebasestebanjove@gmail.com';
const sql = neon(process.env.DATABASE_URL);

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

console.log('─'.repeat(56));
console.log('seed-admin: promoción del administrador único de Nartalis');
console.log('─'.repeat(56));

// 1. Buscar exactamente la cuenta.
const rows = await sql`SELECT id, email, role, status FROM nartalis_users WHERE email = ${ADMIN_EMAIL}`;
if (rows.length === 0) {
  fail(`ABORTADO: no existe la cuenta ${ADMIN_EMAIL}. No se crea ningún usuario.`);
}
if (rows.length > 1) {
  fail(`ABORTADO: hay ${rows.length} filas con el email ${ADMIN_EMAIL}. Revisar manualmente.`);
}
const target = rows[0];
console.log(`✓ Encontrado: ${target.email} (role=${target.role}, status=${target.status})`);

// 2. Promover: role=ADMIN, status=ACTIVE (idempotente).
await sql`UPDATE nartalis_users SET role = 'ADMIN', status = 'ACTIVE' WHERE id = ${target.id}`;
console.log('✓ Actualizado a role=ADMIN, status=ACTIVE');

// 3. Verificar.
const [after] = await sql`SELECT email, role, status FROM nartalis_users WHERE id = ${target.id}`;
if (after.role !== 'ADMIN' || after.status !== 'ACTIVE') {
  fail('La actualización no se verificó correctamente.');
}
console.log(`✓ Verificado: ${after.email} → role=${after.role}, status=${after.status}`);

// 4. Exactamente 1 ADMIN.
const admins = await sql`SELECT email, role, status FROM nartalis_users WHERE role='ADMIN'`;
if (admins.length !== 1) {
  fail(`Se esperaba exactamente 1 ADMIN, hay ${admins.length}. NO se ha modificado a otros usuarios.`);
}
if (admins[0].email !== ADMIN_EMAIL) {
  fail(`El único ADMIN es ${admins[0].email}, se esperaba ${ADMIN_EMAIL}.`);
}

console.log('─'.repeat(56));
console.log(`✓ ADMIN único: ${admins[0].email} | role=${admins[0].role} | status=${admins[0].status}`);
console.log(`SELECT COUNT(*) WHERE role='ADMIN' → ${admins.length}`);
