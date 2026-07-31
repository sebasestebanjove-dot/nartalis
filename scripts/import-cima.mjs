import { neon } from '@neondatabase/serverless';

const CIMA_BASE = 'https://cima.aemps.es/cima/rest/medicamentos';
const PAGE_SIZE = 200;
const DELAY_MS = 250;
const BATCH_SIZE = 200;
const TIMEOUT_MS = 60000;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const onlyPage = (() => {
  const i = args.indexOf('--page');
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : null;
})();

const DATABASE_URL = process.env.DATABASE_URL;
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;
const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://nartalis.com').replace(/\/+$/, '');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

if (!isDryRun && !REVALIDATION_SECRET) {
  console.error('❌ REVALIDATION_SECRET no configurada (necesaria para purgar caché del sitemap)');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page) {
  const url = `${CIMA_BASE}?pagina=${page}&tamanioPagina=${PAGE_SIZE}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`CIMA respondió ${res.status} en página ${page}`);
  return res.json();
}

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

async function upsertBatch(rows) {
  if (rows.length === 0) return;
  const values = [];
  const placeholders = [];
  for (let i = 0; i < rows.length; i++) {
    placeholders.push(`($${i * 2 + 1}, $${i * 2 + 2})`);
    values.push(rows[i].nombre, rows[i].nregistro);
  }
  const query = `
    INSERT INTO farma_name_cache (nombre, nregistro)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (nregistro) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      updated_at = NOW()
    WHERE farma_name_cache.nombre IS DISTINCT FROM EXCLUDED.nombre
  `;
  await sql.query(query, values);
}

async function revalidateAll() {
  if (isDryRun) return;
  try {
    const res = await fetch(`${SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${REVALIDATION_SECRET}` },
      body: JSON.stringify({ revalidateAll: true }),
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json().catch(() => ({}));
    log(body.revalidated ? '✅ Caché de sitemap y /medicamentos purgada' : `⚠️ Revalidate: HTTP ${res.status} ${JSON.stringify(body)}`);
  } catch (e) {
    log(`⚠️ No se pudo llamar al revalidate: ${e.message}`);
  }
}

async function main() {
  const start = Date.now();
  log(`Iniciando import${isDryRun ? ' (DRY-RUN)' : ''} desde CIMA`);

  const first = await fetchPage(1);
  const total = first.totalFilas;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  log(`Catálogo CIMA: ${total} medicamentos, ${totalPages} páginas`);

  const all = new Map();
  const collect = (data) => {
    for (const r of data.resultados || []) {
      if (r.nregistro && r.nombre) all.set(r.nregistro, { nombre: r.nombre, nregistro: r.nregistro });
    }
  };
  collect(first);

  const pagesToFetch = onlyPage ? [onlyPage] : Array.from({ length: totalPages }, (_, i) => i + 1);

  for (const page of pagesToFetch) {
    if (page === 1) continue;
    try {
      const data = await fetchPage(page);
      collect(data);
      log(`Página ${page}/${totalPages} — acumulado: ${all.size}`);
    } catch (e) {
      log(`⚠️ Error página ${page}: ${e.message} — reintentando en 2s`);
      await sleep(2000);
      try {
        const data = await fetchPage(page);
        collect(data);
        log(`Página ${page}/${totalPages} OK tras reintento — acumulado: ${all.size}`);
      } catch (e2) {
        log(`❌ Página ${page} falló definitivamente: ${e2.message}`);
      }
    }
    await sleep(DELAY_MS);
  }

  log(`Recopilados ${all.size} medicamentos únicos`);

  if (isDryRun) {
    log('DRY-RUN: no se escribió nada en la base de datos');
    return;
  }

  const rows = Array.from(all.values());
  let totalOps = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await upsertBatch(batch);
    totalOps += batch.length;
    if ((i / BATCH_SIZE) % 25 === 0) log(`Upsert ${i + batch.length}/${rows.length}...`);
  }

  const prev = await sql`SELECT COUNT(*)::int AS n FROM farma_name_cache`.then((r) => r[0]?.n ?? 0);

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  log(`✅ Import completado: ${totalOps} registros procesados en ${duration}s`);
  log(`Total en farma_name_cache ahora: ${prev}`);

  await revalidateAll();
}

main().catch((e) => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
