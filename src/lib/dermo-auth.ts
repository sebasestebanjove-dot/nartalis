import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

const SESSION_COOKIE = 'dermo_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export interface DermoUser {
  id: string
  name: string
  email: string
  auth_provider: string
  codigo_postal?: string | null
  is_premium: boolean
  consultas_consumidas: number
  created_at: string
}

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

function signToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString('base64url')
  const signature = createHmac('sha256', process.env.NEXTAUTH_SECRET!).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

function verifyToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const signature = createHmac('sha256', process.env.NEXTAUTH_SECRET!).update(`${parts[0]}.${parts[1]}`).digest('base64url')
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(parts[2]))) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function createDermoSession(user: DermoUser): Promise<string> {
  const token = signToken({ id: user.id, email: user.email, name: user.name, is_premium: user.is_premium, consultas_consumidas: user.consultas_consumidas })
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

export async function destroyDermoSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function getDermoSession(): Promise<DermoUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null

  const rows = await sql`
    SELECT id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
    FROM dermo_users WHERE id = ${payload.id}
  `
  if (rows.length === 0) return null
  const u = rows[0]
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    auth_provider: u.auth_provider,
    codigo_postal: u.codigo_postal,
    is_premium: !!u.is_premium,
    consultas_consumidas: u.consultas_consumidas ?? 0,
    created_at: u.created_at,
  }
}
