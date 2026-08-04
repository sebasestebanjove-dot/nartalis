// NARTALIS - SEO FASE 2B
// 301 permanente para aliases de /principios-activos/<slug>.
// Next.js `redirect()` from a Server Component cannot emit a 301 (only 307/308),
// so the real HTTP 301 is issued here via NextResponse.redirect(statusCode=301).
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { slugifyPrincipio } from '@/lib/pa-normalize.mjs';

export const config = {
  matcher: ['/principios-activos/:slug*'],
};

export async function middleware(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    // ['','principios-activos','slug',...]
    const slug = parts[2];
    if (!slug || slug === 'favicon.ico') return NextResponse.next();

    const nslug = slugifyPrincipio(slug);

    const rows = await sql`
      SELECT fp.slug AS canonical_slug
      FROM farma_principle_aliases fa
      JOIN farma_principles fp ON fp.id = fa.principle_id AND fp.active = true
      WHERE fa.alias = ${nslug}
      LIMIT 1
    ` as { canonical_slug: string }[];

    if (rows.length) {
      const loc = `${url.origin}/principios-activos/${rows[0].canonical_slug}`;
      return NextResponse.redirect(loc, 301);
    }
  } catch {
    // best-effort: never block rendering on alias resolution
  }

  return NextResponse.next();
}

export default middleware;
