-- Nartalis - Tracking de búsquedas: anonymous_id + session_id
-- Permite medir: PERSONA → SESIÓN → ACCIÓN → RETORNO
--
-- anonymous_id: UUID persistente del visitante no autenticado (cookie, 1 año).
-- session_id: UUID de sesión (30 min inactividad). Nueva sesión tras 30 min sin actividad.
-- Ambos se generan server-side o client-side y se pasan en el request de búsqueda.
-- is_test: ya existe; se refuerza exclusión en métricas de negocio.
-- No se modifica ni se inventa histórico: nuevas filas tendrán tracking, antiguas tendrán NULL.
-- Idempotente.

BEGIN;

-- 1. anonymous_id: visitante anónimo persistente
ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS anonymous_id UUID;

-- 2. session_id: sesión de 30 min inactividad
ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- 3. Índices para consultas de métricas
CREATE INDEX IF NOT EXISTS idx_farma_search_log_anonymous_id ON farma_search_log(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_farma_search_log_session_id ON farma_search_log(session_id);
CREATE INDEX IF NOT EXISTS idx_farma_search_log_anon_session_created ON farma_search_log(anonymous_id, session_id, created_at);

COMMIT;