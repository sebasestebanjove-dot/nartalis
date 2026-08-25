-- Nartalis - R2: Añadir columnas source y source_page a farma_search_log.
-- Permite la atribución SEO → búsqueda → registro.
-- Idempotente. NO borra ni modifica registros existentes.

ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE farma_search_log
  ADD COLUMN IF NOT EXISTS source_page TEXT;
