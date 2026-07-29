import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_9SqlNXKDfMJ0@ep-morning-mode-agzvkdet-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

// Check tables
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log('Tables:', tables.map(t => t.table_name).join(', '));

// Check farma_search_log
try {
  const count = await sql`SELECT COUNT(*)::int AS cnt FROM farma_search_log`;
  console.log('farma_search_log count:', count[0].cnt);

  const top5 = await sql`SELECT query, COUNT(*)::int AS cnt FROM farma_search_log GROUP BY query ORDER BY cnt DESC LIMIT 5`;
  console.log('Top 5:', JSON.stringify(top5));
} catch(e) {
  console.error('Error querying farma_search_log:', e.message);
}

// Check farma_name_cache
try {
  const cacheCount = await sql`SELECT COUNT(*)::int AS cnt FROM farma_name_cache`;
  console.log('farma_name_cache count:', cacheCount[0].cnt);
} catch(e) {
  console.error('Error querying farma_name_cache:', e.message);
}

process.exit(0);
