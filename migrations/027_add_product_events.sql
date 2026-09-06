-- Nartalis - V2 Analytics: tabla de eventos de producto (append-only).
-- Mide el funnel ANÓNIMO que antes solo vivía en GA4: visitas, visitantes,
-- páginas vistas, medicine_view anónimo, segunda interacción, CTA y registro
-- iniciado. Sin PII: no IP, no User-Agent, no referrer completo, no fingerprint.
--
-- Semántica:
--   - event_name       page_view | medicine_view | medicine_second_view |
--                      cta_view | cta_click | registration_started
--   - visitor_id       UUID anónimo del cliente (localStorage). NO se une con
--                      nartalis_users: anonymous → identified no es
--                      reconstruible hacia atrás de forma fiable.
--   - user_id          Solo si hay sesión (server-side). Los eventos posteriores
--                      al registro ya llevan identidad; los anteriores no.
--   - page             Pathname sin querystring (sin datos personales).
--   - nregistro        Identificador CIMA (solo medicine_*).
--   - source           organic | direct | contextual | internal (adquisición
--                      del visitante anónimo; categoría, no URL).
--   - created_at       TIMESTAMP UTC.
--
-- Idempotente. NO borra ni modifica datos existentes.

BEGIN;

CREATE TABLE IF NOT EXISTS nartalis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  visitor_id UUID,
  user_id UUID REFERENCES nartalis_users(id) ON DELETE SET NULL,
  page TEXT,
  nregistro TEXT,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nartalis_events_created_at ON nartalis_events(created_at);
CREATE INDEX IF NOT EXISTS idx_nartalis_events_name_created ON nartalis_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_nartalis_events_visitor ON nartalis_events(visitor_id);

COMMIT;