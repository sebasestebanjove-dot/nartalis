import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getDermoSession } from '@/lib/dermo-auth';

/* POST /api/dermo/searches — log a product search (anonymous, free, or premium) */
export async function POST(req: NextRequest) {
  try {
    const session = await getDermoSession();
    const body = await req.json();
    const { productName, cp, ingredientsTeaser, totalIngredients, dangerousCount, guestId } = body;

    if (!productName || typeof productName !== 'string') {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 });
    }

    const userEmail = session?.email ?? null;
    const userType = !session ? 'anonymous' : session.is_premium ? 'premium' : 'free';

    /* 1. Save to search history */
    await sql`
      INSERT INTO dermo_search_history (user_email, guest_id, product_name, ingredients_teaser, cp, total_ingredients, dangerous_count)
      VALUES (${userEmail}, ${guestId ?? null}, ${productName}, ${ingredientsTeaser ?? null}, ${cp ?? null}, ${totalIngredients ?? 0}, ${dangerousCount ?? 0})
    `;

    /* 2. Log to admin telemetry */
    await sql`
      INSERT INTO dermo_telemetry_log (product_name, cp, user_type, user_email, tokens_consumed)
      VALUES (${productName}, ${cp ?? null}, ${userType}, ${userEmail}, ${body.tokensConsumed ?? 0})
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error logging search:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* GET /api/dermo/searches — get search history for current user or guest */
export async function GET(req: NextRequest) {
  try {
    const session = await getDermoSession();
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get('guest_id');

    const userEmail = session?.email;
    let rows: any[];

    if (userEmail) {
      rows = await sql`
        SELECT id, product_name, ingredients_teaser, cp, total_ingredients, dangerous_count, created_at
        FROM dermo_search_history
        WHERE user_email = ${userEmail}
        ORDER BY created_at DESC
        LIMIT 50
      `;
    } else if (guestId) {
      rows = await sql`
        SELECT id, product_name, ingredients_teaser, cp, total_ingredients, dangerous_count, created_at
        FROM dermo_search_history
        WHERE guest_id = ${guestId}
        ORDER BY created_at DESC
        LIMIT 50
      `;
    } else {
      rows = [];
    }

    return NextResponse.json({ history: rows });
  } catch (err) {
    console.error('Error fetching search history:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
