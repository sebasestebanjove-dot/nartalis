-- Nartalis - Unified Identity System for Analytics
-- Creates identity_map table and adds tracking columns to nartalis_events
-- Idempotente. NO borra ni modifica datos existentes.

BEGIN;

-- 1. Tabla de vinculación de identidades (append-only)
-- Permite resolver: anonymous_id → visitor_id histórico → user_id
CREATE TABLE IF NOT EXISTS nartalis_identity_map (
  anonymous_id UUID NOT NULL,
  visitor_id UUID,
  user_id UUID NOT NULL REFERENCES nartalis_users(id) ON DELETE CASCADE,
  linked_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (anonymous_id, user_id)
);

-- Índice para búsquedas por visitor_id
CREATE INDEX IF NOT EXISTS idx_nartalis_identity_map_visitor ON nartalis_identity_map(visitor_id);
CREATE INDEX IF NOT EXISTS idx_nartalis_identity_map_user ON nartalis_identity_map(user_id);

-- 2. Añadir columnas de tracking unificado a nartalis_events
-- anonymous_id: identidad anónima principal (cookie HttpOnly, 1 año)
-- session_id: sesión unificada (30 min inactividad) - MISMA que farma_search_log
ALTER TABLE nartalis_events
  ADD COLUMN IF NOT EXISTS anonymous_id UUID;

ALTER TABLE nartalis_events
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- 3. Índices para consultas de métricas
CREATE INDEX IF NOT EXISTS idx_nartalis_events_anonymous_id ON nartalis_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_nartalis_events_session_id ON nartalis_events(session_id);
CREATE INDEX IF NOT EXISTS idx_nartalis_events_anon_session_created ON nartalis_events(anonymous_id, session_id, created_at);

-- 4. Vista de identidad canónica (person_key)
-- person_key = 'user:' || user_id  cuando existe user_id
-- person_key = 'anon:' || anonymous_id  cuando NO existe user_id
-- Esta vista permite métricas unificadas
CREATE OR REPLACE VIEW nartalis_person_identity AS
SELECT 
  COALESCE(e.user_id, im.user_id) AS user_id,
  COALESCE(e.anonymous_id, im.anonymous_id) AS anonymous_id,
  e.visitor_id,
  e.session_id,
  CASE 
    WHEN COALESCE(e.user_id, im.user_id) IS NOT NULL 
    THEN 'user:' || COALESCE(e.user_id, im.user_id)::text
    ELSE 'anon:' || COALESCE(e.anonymous_id, im.anonymous_id)::text
  END AS person_key,
  e.event_name,
  e.page,
  e.nregistro,
  e.source,
  e.created_at
FROM nartalis_events e
LEFT JOIN nartalis_identity_map im 
  ON e.anonymous_id = im.anonymous_id
  OR (e.visitor_id IS NOT NULL AND e.visitor_id = im.visitor_id)
WHERE e.anonymous_id IS NOT NULL OR e.user_id IS NOT NULL OR e.visitor_id IS NOT NULL;

COMMIT;