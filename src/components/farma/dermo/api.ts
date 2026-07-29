import type { DermoProduct, DermoStock, DermoPharmacy, DermoQuizQuestion, ActivateRoutineResponse, RoutineHistoryResponse, TravelProfile, UserMedication, ProductUsage, WeeklyReport } from './types'

export async function searchDermoProducts(q: string, skinType?: string, brandId?: string): Promise<{ results: DermoProduct[]; total: number }> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (skinType) params.set('skin_type', skinType)
  if (brandId) params.set('brand', brandId)
  const res = await fetch(`/api/dermo/search?${params}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(err.error || 'Error al buscar')
  }
  return res.json()
}

export async function getDermoProduct(id: string): Promise<DermoProduct> {
  const res = await fetch(`/api/dermo/product/${id}`)
  if (!res.ok) throw new Error('Error al obtener producto')
  return res.json()
}

export async function getDermoAvailability(productId: string, pc?: string): Promise<DermoStock[]> {
  const params = new URLSearchParams()
  if (pc) params.set('pc', pc)
  const res = await fetch(`/api/dermo/product/${productId}/availability?${params}`)
  if (!res.ok) throw new Error('Error al obtener disponibilidad')
  return res.json()
}

export async function createDermoBooking(productId: string, pharmacyId: string): Promise<{ ok: boolean; error?: string; pickup_code?: string; message?: string }> {
  const res = await fetch('/api/dermo/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, pharmacy_id: pharmacyId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al reservar' }))
    return { ok: false, error: err.error || err.message }
  }
  return res.json()
}

export async function getQuizQuestions(): Promise<DermoQuizQuestion[]> {
  const res = await fetch('/api/admin/dermo/quiz-questions')
  if (!res.ok) throw new Error('Error al cargar preguntas')
  return res.json()
}

export async function generateRoutine(answers: Record<string, any>): Promise<any> {
  const res = await fetch('/api/dermo/routine/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al generar rutina' }))
    throw new Error(err.error || 'Error al generar rutina')
  }
  return res.json()
}

export async function analyzeDermoProduct(productName: string): Promise<{
  productName: string;
  ingredients: { name: string; verdict: string; note: string }[];
  total: number;
  safe: number;
  caution: number;
  avoid: number;
  image_front_url?: string | null;
  image_url?: string | null;
  image_ingredients_url?: string | null;
}> {
  const res = await fetch('/api/dermo/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
    body: JSON.stringify({ productName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al analizar' }));
    throw new Error(err.error || 'Error al analizar producto');
  }
  return res.json();
}

export async function logDermoSearch(params: {
  productName: string;
  cp?: string;
  ingredientsTeaser?: string;
  totalIngredients?: number;
  dangerousCount?: number;
  guestId?: string;
  tokensConsumed?: number;
}): Promise<void> {
  await fetch('/api/dermo/searches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    keepalive: true,
  }).catch(() => {});
}

export async function getSearchHistory(guestId?: string): Promise<{ history: any[] }> {
  const params = guestId ? `?guest_id=${encodeURIComponent(guestId)}` : '';
  const res = await fetch(`/api/dermo/searches${params}`);
  if (!res.ok) return { history: [] };
  return res.json();
}

export async function chatDermo(query: string, productContext?: string): Promise<{ content: string }> {
  const res = await fetch('/api/dermo/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, productContext }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(err.error || 'Error al consultar IA')
  }
  return res.json()
}

export async function activateRoutine(routineId: string, name?: string): Promise<ActivateRoutineResponse> {
  const res = await fetch('/api/dermo/routines/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routine_id: routineId, name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al activar rutina' }))
    return { ok: false, routine: null as any, error: err.error || err.message }
  }
  return res.json()
}

export async function logRoutineCompletion(total_items: number, completed_items: number, log_date?: string): Promise<{ ok: boolean; streak: number; is_completed: boolean }> {
  const res = await fetch('/api/dermo/routines/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total_items, completed_items, log_date }),
  })
  if (!res.ok) return { ok: false, streak: 0, is_completed: false }
  return res.json()
}

export async function getRoutines(): Promise<RoutineHistoryResponse> {
  const res = await fetch('/api/dermo/routines')
  if (!res.ok) return { active: null, history: [] }
  return res.json()
}

// ── Premium V2 API functions ──

export async function logKpiEvent(eventName: string, eventData?: Record<string, any>): Promise<void> {
  try {
    await fetch('/api/dermo/kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: eventName, event_data: eventData || {} }),
    })
  } catch {} // fire-and-forget
}

export async function getActiveTravel(): Promise<{ travel: TravelProfile | null }> {
  const res = await fetch('/api/dermo/travel')
  if (!res.ok) return { travel: null }
  return res.json()
}

export async function createTravel(data: {
  destination: string
  travel_type: string
  start_date: string
  end_date: string
}): Promise<any> {
  const res = await fetch('/api/dermo/travel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al crear viaje' }))
    throw new Error(err.error || 'Error al crear viaje')
  }
  return res.json()
}

export async function cancelTravel(): Promise<{ ok: boolean; restored: boolean }> {
  const res = await fetch('/api/dermo/travel', { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al cancelar viaje' }))
    throw new Error(err.error || 'Error al cancelar viaje')
  }
  return res.json()
}

export async function getMedications(): Promise<{ medications: UserMedication[] }> {
  const res = await fetch('/api/dermo/medications')
  if (!res.ok) return { medications: [] }
  return res.json()
}

export async function addMedication(data: {
  medicine_name: string
  active_ingredient?: string
  atc_code?: string
}): Promise<any> {
  const res = await fetch('/api/dermo/medications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al añadir medicamento' }))
    throw new Error(err.error || 'Error al añadir medicamento')
  }
  return res.json()
}

export async function removeMedication(id: string): Promise<void> {
  await fetch(`/api/dermo/medications/${id}`, { method: 'DELETE' })
}

export async function getProductUsage(): Promise<{ products: ProductUsage[] }> {
  const res = await fetch('/api/dermo/product-usage')
  if (!res.ok) return { products: [] }
  return res.json()
}

export async function addProductUsage(data: {
  product_name: string
  product_id?: string
  size_ml: number
  use_frequency: string
  unit?: string
}): Promise<any> {
  const res = await fetch('/api/dermo/product-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al registrar producto' }))
    throw new Error(err.error || 'Error al registrar producto')
  }
  return res.json()
}

export async function removeProductUsage(id: string): Promise<void> {
  await fetch(`/api/dermo/product-usage/${id}`, { method: 'DELETE' })
}

export async function getWeeklyReport(): Promise<{ report: WeeklyReport | null }> {
  const res = await fetch('/api/dermo/weekly-report')
  if (!res.ok) return { report: null }
  return res.json()
}
