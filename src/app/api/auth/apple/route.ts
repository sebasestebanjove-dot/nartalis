import { NextResponse } from 'next/server'

// Apple: arquitectura preparada. Sin configuración real todavía.
// No se simula autenticación: el endpoint devuelve un estado controlado
// y el frontend muestra un mensaje de UX limpio.
export async function GET() {
  const hasAppleConfig = !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY)
  if (!hasAppleConfig) {
    return NextResponse.json(
      { available: false, message: 'Apple estará disponible próximamente.' },
      { status: 200 },
    )
  }
  // Configurado: aquí se construiría el flujo real de Sign in with Apple.
  return NextResponse.json({ available: true }, { status: 200 })
}
