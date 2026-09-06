// Abstracción para la futura integración con la GA4 Data API.
//
// Objetivo: preparar un punto único donde el Admin pueda leer métricas de
// adquisición/comportamiento anónimo (GA4) sin acoplarse a la implementación.
//
// ESTADO ACTUAL: NO CONECTADA. La propiedad G-QK5NWDSWXV está instrumentada
// client-side (gtag) pero el backend no dispone de autenticación sin credenciales
// (service account / OAuth). Mientras no existan GA4_PROPERTY_ID +
// GA4_SERVICE_ACCOUNT_CREDENTIALS el módulo devuelve «no configurado» y NUNCA
// fabrica cifras: los paneles muestran que los datos se consultan en GA4.
//
// Regla de negocio: GA4 = fuente de verdad del funnel anónimo; Neon = fuente de
// verdad del funnel identificado. No se unen artificialmente (sin identidad fiable).

export type Ga4AvailabilityReason = 'not_configured' | 'ready'

export interface Ga4Availability {
  configured: boolean
  reason: Ga4AvailabilityReason
}

export interface Ga4AcquisitionQuery {
  from: string | null
  to: string | null
}

export interface Ga4AcquisitionData {
  users: number
  sessions: number
  organicSessions: number
  directSessions: number
  contextualSessions: number
  medicineViews: number
  medicineSecondViews: number
}

// Disponibilidad de la conexión GA4. Se leen SOLO variables de entorno
// dedicadas (GA4_*); no existe ninguna credencial hardcodeada.
export function getGa4Availability(): Ga4Availability {
  const propertyId = process.env.GA4_PROPERTY_ID
  const credentials = process.env.GA4_SERVICE_ACCOUNT_CREDENTIALS
  if (!propertyId || !credentials) {
    return { configured: false, reason: 'not_configured' }
  }
  return { configured: true, reason: 'ready' }
}

// Datos de adquisición/comportamiento anónimo (GA4 Data API v1beta,
// analyticsdata.googleapis.com).
//
// DEVUELVE null cuando la integración no está configurada o falla: los
// paneles deben representar «Datos disponibles en GA4», nunca «0» ni un
// valor simulado.
export async function getAnalyticsAcquisition(): Promise<Ga4AcquisitionData | null> {
  if (getGa4Availability().reason !== 'ready') return null
  // TODO(analytics): implementar la llamada a runReport con la credencial
  // segura cuando exista. Hasta entonces no se conecta ni se simula.
  return null
}