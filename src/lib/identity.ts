import { sql } from '@/lib/db';

/**
 * Identidad canónica para Analytics unificado.
 * 
 * Principio: una sola persona = una sola person_key.
 * 
 * - Usuario registrado: person_key = 'user:' + user_id
 * - Usuario anónimo: person_key = 'anon:' + anonymous_id
 * - Usuario anónimo que se registra: person_key = 'user:' + user_id (vinculado vía identity_map)
 */

export type PersonKey = `user:${string}` | `anon:${string}`;

export interface IdentityResolution {
  personKey: PersonKey;
  userId: string | null;
  anonymousId: string | null;
  visitorId: string | null;
  sessionId: string | null;
}

/**
 * Genera la person_key canónica a partir de user_id o anonymous_id.
 * user_id tiene prioridad sobre anonymous_id.
 */
export function buildPersonKey(userId: string | null, anonymousId: string | null): PersonKey {
  if (userId) return `user:${userId}` as PersonKey;
  if (anonymousId) return `anon:${anonymousId}` as PersonKey;
  throw new Error('Se requiere user_id o anonymous_id para generar person_key');
}

/**
 * Resuelve la identidad canónica usando la vista nartalis_person_identity.
 * Prioridad: user_id directo > identity_map (anonymous_id/visitor_id vinculados) > anonymous_id > visitor_id
 */
export async function resolveIdentity(opts: {
  anonymousId?: string | null;
  visitorId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
}): Promise<IdentityResolution> {
  const { anonymousId, visitorId, userId, sessionId } = opts;

  // Si tenemos user_id directo, es identidad registrada
  if (userId) {
    return {
      personKey: `user:${userId}` as PersonKey,
      userId,
      anonymousId: anonymousId ?? null,
      visitorId: visitorId ?? null,
      sessionId: sessionId ?? null,
    };
  }

  // Si tenemos anonymous_id o visitor_id, consultar la vista para ver si hay vinculación
  if (anonymousId || visitorId) {
    const conditions: string[] = [];
    const params: (string | null)[] = [];

    if (anonymousId) {
      conditions.push(`anonymous_id = $${params.length + 1}`);
      params.push(anonymousId);
    }
    if (visitorId) {
      conditions.push(`visitor_id = $${params.length + 1}`);
      params.push(visitorId);
    }

    const whereClause = conditions.join(' OR ');
    const query = `
      SELECT user_id, anonymous_id, visitor_id, session_id, person_key
      FROM nartalis_person_identity
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 1
    `;

    try {
      const rows = await sql.query(query, params);
      if (rows.length > 0) {
        const row = rows[0];
        return {
          personKey: row.person_key as PersonKey,
          userId: row.user_id ?? null,
          anonymousId: row.anonymous_id ?? anonymousId ?? null,
          visitorId: row.visitor_id ?? visitorId ?? null,
          sessionId: row.session_id ?? sessionId ?? null,
        };
      }
    } catch {
      // Silencioso: fallback a lógica local
    }
  }

  // Fallback: sin vinculación en BD
  if (anonymousId) {
    return {
      personKey: `anon:${anonymousId}` as PersonKey,
      userId: null,
      anonymousId,
      visitorId: visitorId ?? null,
      sessionId: sessionId ?? null,
    };
  }

  if (visitorId) {
    return {
      personKey: `anon:${visitorId}` as PersonKey,
      userId: null,
      anonymousId: null,
      visitorId,
      sessionId: sessionId ?? null,
    };
  }

  throw new Error('No se puede resolver identidad sin anonymous_id, visitor_id o user_id');
}

/**
 * Vincula una identidad anónima a un usuario registrado.
 * Debe llamarse en el momento del registro/login.
 * Idempotente: ON CONFLICT DO NOTHING.
 */
export async function linkAnonymousToUser(opts: {
  anonymousId?: string | null;
  visitorId?: string | null;
  userId: string;
}): Promise<void> {
  const { anonymousId, visitorId, userId } = opts;
  
  if (!anonymousId && !visitorId) return;

  try {
    if (anonymousId) {
      await sql.query(
        `INSERT INTO nartalis_identity_map (anonymous_id, visitor_id, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (anonymous_id, user_id) DO NOTHING`,
        [anonymousId, visitorId ?? null, userId]
      );
    }
    
    if (visitorId && !anonymousId) {
      // Solo visitor_id sin anonymous_id - crear entrada con visitor_id como clave
      // Usamos visitor_id como anonymous_id proxy
      await sql.query(
        `INSERT INTO nartalis_identity_map (anonymous_id, visitor_id, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (anonymous_id, user_id) DO NOTHING`,
        [visitorId, visitorId, userId]
      );
    }
  } catch {
    // Silencioso: la vinculación no debe romper el flujo
  }
}

/**
 * Obtiene o crea anonymous_id desde cookies (para uso server-side).
 * Reutiliza la lógica existente de search-tracking.
 */
export async function getAnonymousIdFromCookies(): Promise<string> {
  // Esta función es un placeholder - la implementación real está en search-tracking.ts
  // Se exporta aquí para uso en analytics/events
  const { getTrackingIds } = await import('@/lib/search-tracking');
  const { anonymousId } = await getTrackingIds();
  return anonymousId;
}

/**
 * Obtiene session_id desde cookies (para uso server-side).
 */
export async function getSessionIdFromCookies(): Promise<string> {
  const { getTrackingIds } = await import('@/lib/search-tracking');
  const { sessionId } = await getTrackingIds();
  return sessionId;
}