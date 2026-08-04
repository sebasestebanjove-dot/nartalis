import type { Medicamento } from './types';

export interface FarmaSearchResult {
  resultados: Medicamento[];
  total: number;
  suggestedCorrection?: string;
  message?: string;
  // Campos adicionales (no rompen el contrato previo): indican que la
  // respuesta se sirvió desde la caché local ante un fallo de CIMA.
  fallback?: boolean;
  fallbackReason?: 'cima_http_5xx' | 'timeout' | 'cima_unreachable' | null;
}

export async function buscarMedicamento(q: string, type: 'text' | 'voice' = 'text'): Promise<FarmaSearchResult> {
  const res = await fetch(`/api/farma/search?q=${encodeURIComponent(q)}&type=${type}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(err.error || 'Error al buscar');
  }
  return res.json();
}

export async function getMedicamentoDetail(nregistro: string): Promise<Medicamento> {
  const res = await fetch(`/api/farma/medicamento?nregistro=${encodeURIComponent(nregistro)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(err.error || 'Error al cargar detalle');
  }
  return res.json();
}
