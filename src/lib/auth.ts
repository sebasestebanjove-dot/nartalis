import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

const SESSION_COOKIE = 'nartalis_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

export type NartalisPlan = 'FREE' | 'PREMIUM'
export type NartalisRole = 'USER' | 'ADMIN'
export type NartalisStatus = 'ACTIVE' | 'DISABLED'
export type NartalisProvider = 'email' | 'google' | 'apple'

export interface NartalisUser {
  id: string
  name: string
  email: string
  avatar_url: string | null
  primary_provider: NartalisProvider
  google_id: string | null
  apple_sub: string | null
  status: NartalisStatus
  plan: NartalisPlan
  role: NartalisRole
  email_verified: boolean
  created_at: string
  last_login_at: string | null
}

// Fila de BD devuelta por las consultas a nartalis_users
export interface NartalisUserRow {
  id: string
  name: string
  email: string
  avatar_url: string | null
  primary_provider: string
  google_id: string | null
  apple_sub: string | null
  password_hash?: string | null
  status: string
  plan: string
  role: string
  email_verified: boolean
  created_at: string
  last_login_at: string | null
}

// Shape público de la sesión expuesto a UI/API (nunca incluye password_hash,
// google_id, apple_sub, tokens ni secretos).
export interface PublicSessionUser {
  id: string
  name: string
  email: string
  plan: NartalisPlan
  role: NartalisRole
}

export function toPublicUser(user: NartalisUser): PublicSessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    role: user.role,
  }
}

// Columnas SELECT compartidas por todos los módulos de auth Nartalis
export const NARTALIS_USER_COLUMNS = `
  id, name, email, avatar_url, primary_provider, google_id, apple_sub,
  status, plan, role, email_verified, created_at::text, last_login_at::text
`

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':')
  if (!salt || !key || salt.length !== 32 || key.length !== 128) return false
  const hash = scryptSync(password, salt, 64).toString('hex')
  return timingSafeEqual(Buffer.from(hash), Buffer.from(key))
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET no configurada')
  return secret
}

function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    }),
  ).toString('base64url')
  const signature = createHmac('sha256', getSecret()).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const signature = createHmac('sha256', getSecret()).update(`${parts[0]}.${parts[1]}`).digest('base64url')
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(parts[2]))) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export function mapNartalisUser(u: NartalisUserRow): NartalisUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar_url: u.avatar_url ?? null,
    primary_provider: (u.primary_provider as NartalisProvider) || 'email',
    google_id: u.google_id ?? null,
    apple_sub: u.apple_sub ?? null,
    status: (u.status as NartalisStatus) || 'ACTIVE',
    plan: (u.plan as NartalisPlan) || 'FREE',
    role: (u.role as NartalisRole) || 'USER',
    email_verified: !!u.email_verified,
    created_at: u.created_at,
    last_login_at: u.last_login_at ?? null,
  }
}

export async function createNartalisSession(user: Pick<NartalisUser, 'id' | 'email' | 'name'>): Promise<string> {
  const token = signToken({ id: user.id, email: user.email, name: user.name })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return token
}

export async function destroyNartalisSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function getNartalisSession(): Promise<NartalisUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null

  const rows = await sql`
    SELECT ${sql.unsafe(NARTALIS_USER_COLUMNS)}
    FROM nartalis_users WHERE id = ${payload.id as string}
  `
  if (rows.length === 0) return null
  const user = mapNartalisUser(rows[0] as NartalisUserRow)
  if (user.status !== 'ACTIVE') return null
  return user
}

// Protección server-side de rutas privadas
export async function requireAuth(): Promise<NartalisUser | null> {
  return getNartalisSession()
}
