import { NextResponse } from 'next/server'
import { getDermoSession, createDermoSession } from '@/lib/dermo-auth'
import { sql } from '@/lib/db'

export async function POST() {
  try {
    const user = await getDermoSession()
    if (!user) {
      return NextResponse.json({ error: 'No has iniciado sesión' }, { status: 401 })
    }

    // Only activate if not already premium
    if (user.is_premium) {
      return NextResponse.json({ ok: true, email: user.email, isNew: false })
    }

    const [updated] = await sql`
      UPDATE dermo_users SET is_premium = true WHERE id = ${user.id}
      RETURNING id, name, email, auth_provider, codigo_postal, is_premium, consultas_consumidas, created_at::text
    `

    if (updated) {
      // Recreate session with updated premium status
      await createDermoSession({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        auth_provider: updated.auth_provider,
        codigo_postal: updated.codigo_postal,
        is_premium: true,
        consultas_consumidas: updated.consultas_consumidas ?? 0,
        created_at: updated.created_at,
      })
    }

    return NextResponse.json({ ok: true, email: user.email, isNew: false })
  } catch (err: any) {
    console.error('dermo premium activate error:', err)
    return NextResponse.json({ error: 'Error al activar premium: ' + (err?.message || err) }, { status: 500 })
  }
}
