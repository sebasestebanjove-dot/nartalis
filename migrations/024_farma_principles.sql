-- Nartalis - SEO FASE 2A.1: entidad canónica de principios activos.
-- Crea farma_principles (fuente de verdad SEO de PA) y enlaza pa_cache.
-- Idempotente y seguro. NO borra ni modifica registros existentes.

CREATE TABLE IF NOT EXISTS farma_principles (
  id SERIAL PRIMARY KEY,
  principio_original TEXT NOT NULL,
  nombre_canonico TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  normalized_key TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'simple' CHECK (tipo IN ('simple','compuesto','valor_basura')),
  origen TEXT NOT NULL DEFAULT 'pa_cache',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  medicine_count INTEGER NOT NULL DEFAULT 0,
  first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farma_principles_normalized_key ON farma_principles (normalized_key);
CREATE INDEX IF NOT EXISTS idx_farma_principles_active ON farma_principles (active);
CREATE INDEX IF NOT EXISTS idx_farma_principles_tipo ON farma_principles (tipo);

-- Relación pa_cache -> entidad canónica. Nullable durante la migración.
ALTER TABLE pa_cache
  ADD COLUMN IF NOT EXISTS pa_principle_id BIGINT REFERENCES farma_principles(id);

CREATE INDEX IF NOT EXISTS idx_pa_cache_pa_principle_id ON pa_cache (pa_principle_id);
