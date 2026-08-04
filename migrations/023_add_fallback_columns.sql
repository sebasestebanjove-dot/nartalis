-- Nartalis - FASE Fallback: rastreo de búsquedas servidas desde la caché local.
-- Añade a farma_search_log la trazabilidad del fallback ante fallo de CIMA.
-- Idempotente y seguro. NO borra ni modifica registros existentes.
-- Únicamente añade dos columnas nuevas.

ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS used_fallback BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS fallback_reason TEXT;