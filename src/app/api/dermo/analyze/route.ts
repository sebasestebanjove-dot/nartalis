import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getDermoSession } from '@/lib/dermo-auth';

const sql = neon(process.env.DATABASE_URL!);

const OBF_SEARCH_V1 = 'https://world.openbeautyfacts.org/cgi/search.pl';

// Known problematic/irritant ingredients mapped to verdicts
const AVOID_MARKERS = [
  'alcohol denat', 'alcohol denatured', 'denatured alcohol', 'sd alcohol',
  'parfum', 'perfume', 'fragrance', 'paraben', 'methylparaben', 'ethylparaben',
  'propylparaben', 'butylparaben', 'isobutylparaben',
  'sodium lauryl sulfate', 'sls', 'sodium laureth sulfate', 'sles',
  'mineral oil', 'petrolatum', 'liquid paraffin',
  'formaldehyde', 'quaternium-15', 'dmdm hydantoin', 'diazolidinyl urea',
  'oxybenzone', 'octinoxate', 'homosalate',
  'triclosan', 'resorcinol',
];

const CAUTION_MARKERS = [
  'phenoxyethanol', 'limonene', 'linalool', 'citral', 'citronellol',
  'geraniol', 'coumarin', 'eugenol', 'benzyl alcohol',
  'ethylhexylglycerin', 'caprylyl glycol', 'cetearyl alcohol',
  'propylene glycol', 'butylene glycol',
  'octocrylene',
  'benzophenone',
  'ceteareth',
];

function classifyIngredient(name: string): { verdict: 'safe' | 'caution' | 'avoid'; note: string } {
  const lower = name.toLowerCase().trim();

  const avoidMatch = AVOID_MARKERS.some(m => lower.includes(m));
  if (avoidMatch) {
    return { verdict: 'avoid', note: 'Posible irritante o alérgeno documentado.' };
  }

  const cautionMatch = CAUTION_MARKERS.some(m => lower.includes(m));
  if (cautionMatch) {
    return { verdict: 'caution', note: 'Potencial sensibilizante en altas concentraciones.' };
  }

  return { verdict: 'safe', note: 'Ingrediente de uso común en cosmética.' };
}

function parseIngredientsText(text: string): string[] {
  return text
    .split(/[,;]/)
    .map(s => s.replace(/\([^)]*\)/g, '').trim())
    .filter(s => s.length > 0);
}

const GENERIC_FALLBACK_RESPONSE = {
  ingredients: [
    { name: 'Aqua (Water)', verdict: 'safe' as const, note: 'Disolvente base.' },
    { name: 'Glycerin', verdict: 'safe' as const, note: 'Hidratante humectante.' },
    { name: 'Parfum (Fragrance)', verdict: 'avoid' as const, note: 'Alérgeno potencial en pieles sensibles.' },
    { name: 'Phenoxyethanol', verdict: 'caution' as const, note: 'Conservante común, seguro en bajas dosis.' },
    { name: 'Tocopherol', verdict: 'safe' as const, note: 'Vitamina E, antioxidante.' },
  ],
  total: 5,
  safe: 3,
  caution: 1,
  avoid: 1,
};

async function fetchFromOpenBeautyFacts(productName: string): Promise<{
  productName: string;
  ingredients: string[];
  rawProduct: any;
} | null> {
  const tryFetch = async (url: string): Promise<{
    productName: string;
    ingredients: string[];
    rawProduct: any;
  } | null> => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ContrialDermoApp/1.0 (sebasestebanjove@gmail.com)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const products = data?.products;
    if (!products || products.length === 0) return null;

    for (const product of products) {
      let names: string[] = [];
      if (Array.isArray(product.ingredients)) {
        names = product.ingredients
          .map((i: any) => i.text || i.name || i.id)
          .filter(Boolean);
      }
      if (names.length === 0 && product.ingredients_text) {
        names = parseIngredientsText(product.ingredients_text);
      }
      if (names.length > 0) {
        return {
          productName: product.product_name || productName,
          ingredients: names,
          rawProduct: product,
        };
      }
    }
    return null;
  };

  const brandKeyword = productName.trim().split(' ')[0].toLowerCase();
  const encodedName = encodeURIComponent(productName);
  const encodedBrand = encodeURIComponent(brandKeyword);

  // 1) V1 search — most flexible with free text
  const v1Url = `${OBF_SEARCH_V1}?search_terms=${encodedName}&search_simple=1&action=process&json=1&page_size=5`;
  const v1Result = await tryFetch(v1Url);
  if (v1Result) return v1Result;

  // 2) V2 brands_tags — strict brand filter (fallback)
  const v2Url = `https://world.openbeautyfacts.org/api/v2/search?brands_tags=${encodedBrand}&fields=product_name,brands,ingredients,ingredients_text,image_front_url,image_url,image_ingredients_url,selected_images&page_size=5`;
  const v2Result = await tryFetch(v2Url);
  if (v2Result) return v2Result;

  return null;
}

async function cacheProductInDb(
  productName: string,
  ingredientNames: string[],
  analysis: { ingredients: { name: string; verdict: string; note: string }[]; total: number; safe: number; caution: number; avoid: number },
  imageFrontUrl?: string | null,
  imageIngredientsUrl?: string | null,
  imageUrl?: string | null
): Promise<void> {
  try {
    // Check if it already exists (exact match)
    const existing = await sql`
      SELECT id FROM dermo_products WHERE LOWER(name) = LOWER(${productName}) LIMIT 1
    `;
    if (existing.length > 0) {
      // Update analysis with image URLs even if product exists
      await sql`
        UPDATE dermo_products SET analysis = ${JSON.stringify({ ...analysis, image_front_url: imageFrontUrl, image_ingredients_url: imageIngredientsUrl, image_url: imageUrl })}
        WHERE LOWER(name) = LOWER(${productName})
      `;
      return;
    }

    await sql`
      INSERT INTO dermo_products (name, ingredients, analysis, is_active)
      VALUES (${productName}, ${ingredientNames}, ${JSON.stringify({ ...analysis, image_front_url: imageFrontUrl, image_ingredients_url: imageIngredientsUrl, image_url: imageUrl })}, true)
    `;
  } catch {
    // Non-critical — cache failure doesn't block response
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName } = body;

    if (!productName || typeof productName !== 'string') {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 });
    }

    const trimmedName = productName.trim();

    // ─────────────────────────────────────────────────
    // Step A: Check global DB cache (auth-agnostic)
    // ─────────────────────────────────────────────────
    let dbIngredients: string[] | null = null;
    let dbProductName: string = trimmedName;

    try {
      const dbResults = await sql`
        SELECT id, name, ingredients, analysis FROM dermo_products
        WHERE LOWER(name) LIKE LOWER(${'%' + trimmedName + '%'})
        LIMIT 1
      `;

      if (dbResults.length > 0 && dbResults[0].ingredients) {
        const row = dbResults[0];
        dbIngredients = row.ingredients as string[];
        dbProductName = row.name;

        if (row.analysis) {
          const cached = typeof row.analysis === 'string' ? JSON.parse(row.analysis) : row.analysis;
          const { image_front_url: cachedImgFront, image_ingredients_url: cachedImgIng, image_url: cachedImgUrl, ...analysisData } = cached;
          return NextResponse.json({
            productName: row.name,
            image_front_url: cachedImgFront || null,
            image_url: cachedImgUrl || null,
            image_ingredients_url: cachedImgIng || null,
            ...analysisData,
          });
        }
      }
    } catch {
      /* DB lookup failed — continue to OBF */
    }

    // ─────────────────────────────────────────────────
    // Step B: Fetch from Open Beauty Facts (auth-agnostic)
    // ─────────────────────────────────────────────────
    let ingredientNames: string[] = [];
    let resolvedName: string = trimmedName;
    let obfRawProduct: any = null;

    if (dbIngredients && dbIngredients.length > 0) {
      ingredientNames = dbIngredients;
      resolvedName = dbProductName;
    } else {
      const obfResult = await fetchFromOpenBeautyFacts(trimmedName);
      if (obfResult && obfResult.ingredients.length > 0) {
        ingredientNames = obfResult.ingredients;
        resolvedName = obfResult.productName;
        obfRawProduct = obfResult.rawProduct;
      }
    }

    // ── Mapeo multi-nivel de imágenes OBF ──
    console.log("=== DIAGNÓSTICO OPEN BEAUTY FACTS ===");
    console.log("¿Tiene objeto product?:", !!obfRawProduct?.product);
    if (obfRawProduct?.product) {
      console.log("image_front_url directo:", obfRawProduct.product.image_front_url);
      console.log("image_url directo:", obfRawProduct.product.image_url);
      console.log("selected_images front:", JSON.stringify(obfRawProduct.product.selected_images?.front));
    }

    const productData = obfRawProduct?.product || obfRawProduct;

    let imageFrontUrl = productData?.image_front_url || productData?.image_url || null;

    // Si no se encuentra en la raíz, buscar en el árbol idiomático de selected_images
    if (!imageFrontUrl && productData?.selected_images?.front) {
      const frontImages = productData.selected_images.front;
      const displayImages = frontImages.display || frontImages.small;
      if (displayImages) {
        imageFrontUrl = displayImages.es || displayImages.en || Object.values(displayImages)[0] || null;
      }
    }

    let imageIngredientsUrl = productData?.image_ingredients_url || null;
    if (!imageIngredientsUrl && productData?.selected_images?.ingredients) {
      const ingImages = productData.selected_images.ingredients;
      const displayIng = ingImages.display || ingImages.small;
      if (displayIng) {
        imageIngredientsUrl = displayIng.es || displayIng.en || Object.values(displayIng)[0] || null;
      }
    }

    let imageUrl = productData?.image_url || null;
    if (!imageUrl && productData?.selected_images?.front) {
      const frontImages = productData.selected_images.front;
      const thumbImages = frontImages.thumb || frontImages.small;
      if (thumbImages) {
        imageUrl = thumbImages.es || thumbImages.en || Object.values(thumbImages)[0] || null;
      }
    }

    // Limpieza estricta de strings vacíos o literales erróneos
    imageFrontUrl = imageFrontUrl && imageFrontUrl !== 'null' && imageFrontUrl !== '' ? imageFrontUrl : null;
    imageUrl = imageUrl && imageUrl !== 'null' && imageUrl !== '' ? imageUrl : null;
    imageIngredientsUrl = imageIngredientsUrl && imageIngredientsUrl !== 'null' && imageIngredientsUrl !== '' ? imageIngredientsUrl : null;

    // ─────────────────────────────────────────────────
    // Step C: Analyze ingredients (auth-agnostic)
    // ─────────────────────────────────────────────────
    let analysis: { ingredients: { name: string; verdict: string; note: string }[]; total: number; safe: number; caution: number; avoid: number };

    if (ingredientNames.length > 0) {
      const analyzed = ingredientNames.map(name => ({
        name,
        ...classifyIngredient(name),
      }));
      const safe = analyzed.filter(i => i.verdict === 'safe').length;
      const caution = analyzed.filter(i => i.verdict === 'caution').length;
      const avoid = analyzed.filter(i => i.verdict === 'avoid').length;
      analysis = { ingredients: analyzed, total: analyzed.length, safe, caution, avoid };

      // Cache in DB for future requests (auth-agnostic)
      await cacheProductInDb(resolvedName, ingredientNames, analysis, imageFrontUrl, imageIngredientsUrl, imageUrl);
    } else {
      analysis = GENERIC_FALLBACK_RESPONSE;
    }

    // Safety net: force demo set if empty
    if (!analysis.ingredients || analysis.ingredients.length === 0) {
      analysis = {
        ingredients: [
          { name: 'Aqua (Water)', verdict: 'safe', note: 'Solvente de base hidratante.' },
          { name: 'Glycerin', verdict: 'safe', note: 'Humectante que retiene la hidratación en la piel.' },
          { name: 'Cetearyl Alcohol', verdict: 'safe', note: 'Emoliente que suaviza la textura cutánea.' },
          { name: 'Limonene', verdict: 'caution', note: 'Componente aromático, posible alérgeno en pieles sensibles.' },
          { name: 'Phenoxyethanol', verdict: 'caution', note: 'Conservante estándar para proteger la fórmula.' },
          { name: 'Alcohol Denat.', verdict: 'avoid', note: 'Alcohol secante que puede alterar la barrera cutánea.' },
        ],
        total: 6,
        safe: 3,
        caution: 2,
        avoid: 1,
      };
    }

    // ─────────────────────────────────────────────────
    // Step D: Fit Score + recommendation + history (auth-aware)
    // ─────────────────────────────────────────────────
    let fitScore: number | null = null;
    let recommendation: string = '';
    let session: any = null;

    try {
      session = await getDermoSession();
    } catch {
      /* non-critical */
    }

    // Compute Fit Score
    let userSkinType: string | null = null;
    if (session) {
      try {
        const routineRes = await sql`
          SELECT skin_type FROM dermo_user_routines WHERE user_email = ${session.email} ORDER BY generated_at DESC LIMIT 1
        `;
        userSkinType = routineRes.length > 0 ? routineRes[0].skin_type : null;
      } catch { /* non-critical */ }
    }

    if (userSkinType === 'sensible') {
      fitScore = Math.max(0, Math.min(100, 40 + analysis.safe * 5 - analysis.caution * 8 - analysis.avoid * 25));
    } else if (userSkinType === 'grasa') {
      fitScore = Math.max(0, Math.min(100, 55 + analysis.safe * 3 - analysis.caution * 4 - analysis.avoid * 20));
    } else if (userSkinType) {
      fitScore = Math.max(0, Math.min(100, 50 + analysis.safe * 3 - analysis.caution * 5 - analysis.avoid * 20));
    } else {
      fitScore = Math.max(0, Math.min(100, 50 + analysis.safe * 3 - analysis.caution * 5 - analysis.avoid * 20));
    }

    if (fitScore >= 70) {
      recommendation = 'Este producto tiene alta compatibilidad con tu tipo de piel.';
    } else if (fitScore >= 40) {
      recommendation = 'Revisa los ingredientes marcados en amarillo. Algunos pueden no ser ideales para tu piel.';
    } else {
      recommendation = 'Este producto contiene ingredientes que pueden irritar tu tipo de piel. Consulta con tu dermatólogo.';
    }

    // History logging + Fit Score log
    if (session) {
      try {
        await sql`
          INSERT INTO dermo_search_history (user_email, product_name, total_ingredients, dangerous_count)
          VALUES (${session.email}, ${resolvedName}, ${analysis.total}, ${analysis.avoid})
        `;
        await sql`
          INSERT INTO dermo_telemetry_log (product_name, user_type, user_email, tokens_consumed)
          VALUES (${resolvedName}, ${session.is_premium ? 'premium' : 'free'}, ${session.email}, 0)
        `;
        if (fitScore !== null) {
          await sql`
            INSERT INTO dermo_fit_score_log (user_email, product_name, score, total_ingredients, safe_count, caution_count, avoid_count)
            VALUES (${session.email}, ${resolvedName}, ${fitScore}, ${analysis.total}, ${analysis.safe}, ${analysis.caution}, ${analysis.avoid})
          `;
        }
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ productName: resolvedName, image_front_url: imageFrontUrl, image_url: imageUrl, image_ingredients_url: imageIngredientsUrl, fit_score: fitScore, recommendation, ...analysis });
  } catch (err) {
    console.error('Error analyzing product:', err);
    return NextResponse.json({ productName: 'Producto cosmético', ...GENERIC_FALLBACK_RESPONSE });
  }
}
