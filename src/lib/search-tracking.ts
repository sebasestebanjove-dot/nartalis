import { cookies } from 'next/headers';

const ANONYMOUS_ID_COOKIE = 'nartalis_anon_id';
const SESSION_ID_COOKIE = 'nartalis_session_id';
const SESSION_LAST_ACTIVITY_COOKIE = 'nartalis_session_last_activity';

const ANONYMOUS_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (cookie max age)
const SESSION_INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Genera un UUID v4 seguro
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Obtiene o crea el anonymous_id persistente (cookie de 1 año).
 * Se usa para identificar a un visitante no autenticado a lo largo del tiempo.
 */
export async function getOrCreateAnonymousId(): Promise<string> {
  const cookieStore = await cookies();
  let anonId = cookieStore.get(ANONYMOUS_ID_COOKIE)?.value;
  
  if (!anonId) {
    anonId = generateUUID();
    cookieStore.set(ANONYMOUS_ID_COOKIE, anonId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ANONYMOUS_ID_MAX_AGE,
    });
  }
  
  return anonId;
}

/**
 * Obtiene o crea el session_id con lógica de 30 minutos de inactividad.
 * - Si no existe session_id o han pasado >30 min desde last_activity → nueva sesión
 * - Si hay actividad dentro de 30 min → misma sesión, actualiza last_activity
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const now = Date.now();
  
  let sessionId = cookieStore.get(SESSION_ID_COOKIE)?.value;
  const lastActivityStr = cookieStore.get(SESSION_LAST_ACTIVITY_COOKIE)?.value;
  const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : null;
  
  const isNewSession = !sessionId || !lastActivity || (now - lastActivity > SESSION_INACTIVITY_THRESHOLD_MS);
  
  if (isNewSession) {
    sessionId = generateUUID();
  } else if (!sessionId) {
    sessionId = generateUUID();
  }
  
  cookieStore.set(SESSION_ID_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  
  // Siempre actualizar last_activity en cada request
  cookieStore.set(SESSION_LAST_ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  
  return sessionId;
}

/**
 * Obtiene ambos identificadores de tracking para una request.
 * Retorna { anonymousId, sessionId, isNewSession }
 */
export async function getTrackingIds(): Promise<{
  anonymousId: string;
  sessionId: string;
  isNewSession: boolean;
}> {
  const cookieStore = await cookies();
  const now = Date.now();
  
  // anonymous_id
  let anonymousId = cookieStore.get(ANONYMOUS_ID_COOKIE)?.value;
  if (!anonymousId) {
    anonymousId = generateUUID();
    cookieStore.set(ANONYMOUS_ID_COOKIE, anonymousId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ANONYMOUS_ID_MAX_AGE,
    });
  }
  
  // session_id
  let sessionId = cookieStore.get(SESSION_ID_COOKIE)?.value;
  const lastActivityStr = cookieStore.get(SESSION_LAST_ACTIVITY_COOKIE)?.value;
  const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : null;
  
  const isNewSession = !sessionId || !lastActivity || (now - lastActivity > SESSION_INACTIVITY_THRESHOLD_MS);
  
  if (isNewSession || !sessionId) {
    sessionId = generateUUID();
    cookieStore.set(SESSION_ID_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
  }
  
  cookieStore.set(SESSION_LAST_ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  
  return { anonymousId, sessionId, isNewSession };
}

/**
 * Verifica si una request viene de un entorno de test/admin que debe excluirse de métricas
 */
export function isTestRequest(req: Request): boolean {
  // Header de test (solo en entornos no-producción)
  if (process.env.NODE_ENV !== 'production' && req.headers.get('x-nartalis-test') === '1') {
    return true;
  }
  // Localhost/desarrollo
  const host = req.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  return false;
}

/**
 * Nombres de cookies para uso en cliente si se necesita acceso (ej. debug)
 */
export const TRACKING_COOKIE_NAMES = {
  anonymousId: ANONYMOUS_ID_COOKIE,
  sessionId: SESSION_ID_COOKIE,
  sessionLastActivity: SESSION_LAST_ACTIVITY_COOKIE,
} as const;