// Circuit breaker en memoria (por instancia) para el acceso a CIMA.
//
// Objetivo: cuando CIMA cae de forma sostenida, no gastar los 10s de timeout
// en cada petición. Una vez abierto, las búsquedas saltan directo al fallback
// local (farma_name_cache) hasta que pasa el cooldown y una sonda confirma
// que CIMA vuelve a responder.
//
// Es PER INSTANCIA (cada función serverless mantiene su propio estado). No es
// un estado compartido global, pero es SEGURO por diseño: en el peor caso una
// instancia fría con CIMA caído intenta CIMA una vez, falla y cae al fallback.
// Nunca impide que el usuario obtenga resultados (CIMA o BD local).
//
// Latencia en modo normal: CERO. No se consulta Neon ni ninguna otra fuente.

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerConfig {
  // Fallos consecutivos de CIMA que abren el breaker.
  failureThreshold: number;
  // Tiempo en OPEN antes de pasar a HALF_OPEN (una sonda).
  openTimeoutMs: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private probeInFlight = false;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  // ¿Debemos intentar llamar a CIMA en esta petición?
  //  - closed: sí.
  //  - open (cooldown no superado): no → fallback local directo.
  //  - open → half_open (cooldown superado): permitir UNA sonda.
  //  - half_open con sonda en curso: no.
  shouldAttemptCima(now: number = Date.now()): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (now - this.openedAt >= this.config.openTimeoutMs) {
        this.state = 'half_open';
        this.probeInFlight = false;
        return true;
      }
      return false;
    }

    // half_open: una única petición de prueba.
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  onCimaSuccess(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.openedAt = 0;
    this.probeInFlight = false;
  }

  onCimaFailure(): void {
    if (this.state === 'half_open') {
      // La sonda falló → volver a abrir durante otro cooldown.
      this.state = 'open';
      this.openedAt = Date.now();
      this.probeInFlight = false;
      this.consecutiveFailures = 0;
      return;
    }
    if (this.state === 'open') return; // ya abierto: no acumular.
    // closed
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  // Solo para tests (invocado únicamente cuando isTest es true).
  setOpenTimeoutMs(ms: number): void {
    this.config.openTimeoutMs = ms;
  }
}

export const cimaBreaker = new CircuitBreaker({
  failureThreshold: 3,
  openTimeoutMs: 60_000,
});
