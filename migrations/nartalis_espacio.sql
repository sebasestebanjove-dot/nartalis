-- Nartalis - FASE 3: Mi espacio personal
-- Tablas de medicamentos guardados y historial personal.
-- Identificador estable de medicamento: nregistro (Número de Registro CIMA).
-- No se altera ninguna tabla existente. Migración idempotente.

BEGIN;

-- ============================================================
-- 1. Medicamentos guardados del usuario (incluye favoritos)
-- ============================================================
CREATE TABLE IF NOT EXISTS nartalis_user_medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nartalis_users(id) ON DELETE CASCADE,
  nregistro TEXT NOT NULL,
  nombre TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, nregistro)
);

CREATE INDEX IF NOT EXISTS idx_user_med_user ON nartalis_user_medicamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_med_fav ON nartalis_user_medicamentos(user_id, is_favorite);

-- ============================================================
-- 2. Historial personal de consultas (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS nartalis_user_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nartalis_users(id) ON DELETE CASCADE,
  nregistro TEXT NOT NULL,
  nombre TEXT NOT NULL,
  consulted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_cons_user_date ON nartalis_user_consultas(user_id, consulted_at DESC);

COMMIT;
