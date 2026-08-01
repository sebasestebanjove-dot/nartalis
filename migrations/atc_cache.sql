-- Migración: tabla de cache ATC (niveles 3 y 4)
-- Idempotente. Alimentada desde CIMA individual API vía fetchMedicamentoByNregistro().
-- NO almacena nivel 5 (duplicaría /principios-activos).
-- Cada fármaco puede tener múltiples ATC → PK compuesta (code, nregistro).

CREATE TABLE IF NOT EXISTS atc_cache (
  code VARCHAR(10) NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (3, 4)),
  name TEXT NOT NULL,
  parent_code VARCHAR(10),
  nregistro TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (code, nregistro)
);

CREATE INDEX IF NOT EXISTS idx_atc_cache_code ON atc_cache (code);
CREATE INDEX IF NOT EXISTS idx_atc_cache_parent ON atc_cache (parent_code);
CREATE INDEX IF NOT EXISTS idx_atc_cache_level_code ON atc_cache (level, code);
