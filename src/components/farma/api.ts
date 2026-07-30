import type { Medicamento } from './types';

export async function buscarMedicamento(q: string, type: 'text' | 'voice' = 'text'): Promise<{ resultados: Medicamento[]; total: number; suggestedCorrection?: string; message?: string }> {
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
