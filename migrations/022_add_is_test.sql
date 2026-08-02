-- Añade is_test a farma_search_log para distinguir búsquedas de test de búsquedas reales.
-- Se activa via header X-Nartalis-Test: 1 solo en entornos no-producción.
-- Idempotente. No modifica datos históricos (DEFAULT FALSE).

ALTER TABLE farma_search_log
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;
