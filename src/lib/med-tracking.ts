import { track } from '@/lib/analytics';

// Singleton de módulo (lado cliente) para la semántica de sesión de medicamentos.
// Responsabilidad EXCLUSIVA: delimitar la sesión de navegación y emitir
// `medicine_second_view` (primera transición 1 → 2 medicamentos distintos).
// NO decide si debe emitirse `medicine_view` (eso lo resuelve el componente).
const SESSION_IDLE_MS = 30 * 60 * 1000;

let lastDistinctNregistro: string | null = null;
let distinctCount = 0;
let secondViewFired = false;
let lastActivityAt = 0;

export function registerMedView(nregistro: string, nombre: string, source: string): void {
  if (typeof window === 'undefined') return;
  if (!nregistro) return;

  const now = Date.now();

  // Delimitación de sesión: nueva cuando no hay actividad reciente o no hay sesión previa.
  const isNewSession = distinctCount === 0 || now - lastActivityAt > SESSION_IDLE_MS;

  if (isNewSession) {
    lastDistinctNregistro = nregistro;
    distinctCount = 1;
    secondViewFired = false;
  }

  // medicine_view SIEMPRE (la "visita real" la determinó el componente).
  track('medicine_view', { nregistro, nombre, source });

  // Evaluar la transición contra el estado ANTERIOR, antes de mutarlo.
  const isDistinct = nregistro !== lastDistinctNregistro;

  if (!isNewSession && isDistinct) {
    distinctCount += 1;
    if (distinctCount === 2 && !secondViewFired) {
      track('medicine_second_view', { nregistro, nombre, source });
      secondViewFired = true;
    }
  }

  if (isDistinct) {
    lastDistinctNregistro = nregistro;
  }

  lastActivityAt = now;
}
