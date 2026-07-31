-- Nartalis - FASE 6/6A: Admin + Analytics
-- Amplía farma_search_log para trazabilidad de búsquedas (texto/voz) y métricas de producto.
-- Idempotente. NO toca nartalis_users, nartalis_user_medicamentos, nartalis_user_consultas,
-- farma_name_cache, dermo_* ni ia_module_users salvo la referencia user_id.

BEGIN;

-- 1. user_id: autor de la búsqueda cuando existe sesión (anónima = NULL).
ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES nartalis_users(id) ON DELETE SET NULL;

-- 2. result_count: número real de resultados devueltos por el endpoint.
ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS result_count INTEGER NOT NULL DEFAULT 0;

-- 3. was_successful: true si result_count > 0, false si 0.
ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS was_successful BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Índices para las consultas del dashboard.
CREATE INDEX IF NOT EXISTS idx_farma_search_log_user_id ON farma_search_log(user_id);
-- idx_farma_search_log_created_at ya existe en la base; IF NOT EXISTS es no-op.
CREATE INDEX IF NOT EXISTS idx_farma_search_log_created_at ON farma_search_log(created_at);

COMMIT;
