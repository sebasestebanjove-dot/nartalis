import { getNartalisSession, type NartalisUser } from '@/lib/auth'

// Longitudes límite de los campos aceptados por las APIs de espacio.
export const NREGISTRO_MAX = 64
export const NOMBRE_MAX = 255

// Helper de autenticación para las rutas personales de /api/espacio.
// Devuelve la sesión de Nartalis o null (la ruta responde 401).
export async function requireEspacioUser(): Promise<NartalisUser | null> {
  return getNartalisSession()
}

// Valida que nregistro esté presente, sea texto y no exceda el límite.
export function validateNregistro(value: unknown): { ok: true; nregistro: string } | { ok: false; error: string } {
  const nregistro = typeof value === 'string' ? value.trim() : ''
  if (!nregistro) {
    return { ok: false, error: 'Falta nregistro' }
  }
  if (nregistro.length > NREGISTRO_MAX) {
    return { ok: false, error: `nregistro no puede superar ${NREGISTRO_MAX} caracteres` }
  }
  return { ok: true, nregistro }
}

// Normaliza el nombre enviado por el cliente (opcional).
export function validateNombre(value: unknown): { ok: true; nombre: string } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return { ok: true, nombre: '' }
  }
  if (typeof value !== 'string') {
    return { ok: false, error: 'nombre debe ser texto' }
  }
  const nombre = value.trim()
  if (nombre.length > NOMBRE_MAX) {
    return { ok: false, error: `nombre no puede superar ${NOMBRE_MAX} caracteres` }
  }
  return { ok: true, nombre }
}
