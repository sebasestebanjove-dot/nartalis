import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { makeSlug } from '@/lib/slug';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.REVALIDATION_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { nregistro, revalidateAll } = body as { nregistro?: string; revalidateAll?: boolean };

  if (revalidateAll) {
    revalidatePath('/sitemap.xml');
    revalidatePath('/medicamentos');
    return NextResponse.json({ revalidated: true, scope: 'all' });
  }

  if (!nregistro) {
    return NextResponse.json({ error: 'Falta nregistro' }, { status: 400 });
  }

  try {
    const rows = (await sql`SELECT nombre FROM farma_name_cache WHERE nregistro = ${nregistro}`) as { nombre: string }[];
    if (!rows.length) {
      return NextResponse.json({ error: 'nregistro no encontrado en caché' }, { status: 404 });
    }

    const slug = makeSlug(rows[0].nombre, nregistro);
    revalidatePath(`/prospectos/${slug}`);
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ revalidated: true, slug });
  } catch (err) {
    return NextResponse.json({ error: 'Error de revalidación', details: String(err) }, { status: 500 });
  }
}
