import { getNartalisSession, type NartalisUser } from '@/lib/auth'

// Modelo de autorización administrativa de Nartalis.
// La autorización SIEMPRE depende de session.user.role === 'ADMIN'.
// Nunca de emails hardcodeados ni de valores enviados por el cliente.

export type AdminGuardResult =
  | { ok: true; user: NartalisUser }
  | { ok: false; reason: 'no_session' | 'forbidden' }

// Guard server-side para páginas y APIs administrativas.
// - Sin sesión: { ok:false, reason:'no_session' } → 401 en APIs, redirect /login en páginas
// - Sesión USER: { ok:false, reason:'forbidden' } → 403 en APIs, redirect /espacio en páginas
// - Sesión ADMIN: { ok:true, user }
export async function requireAdmin(): Promise<AdminGuardResult> {
  const user = await getNartalisSession()
  if (!user) {
    return { ok: false, reason: 'no_session' }
  }
  if (user.role !== 'ADMIN') {
    return { ok: false, reason: 'forbidden' }
  }
  return { ok: true, user }
}

export function isAdminUser(user: Pick<NartalisUser, 'role'> | null): boolean {
  return !!user && user.role === 'ADMIN'
}

// Respuesta JSON estándar para denegar acceso en APIs administrativas.
export function adminUnauthorized(reason: 'no_session' | 'forbidden') {
  return reason === 'forbidden'
    ? { error: 'Forbidden', status: 403 as const }
    : { error: 'No autorizado', status: 401 as const }
}
