-- Cache de principios activos: mapea principio activo → nregistro.
-- Poblada orgánicamente desde CIMA individual API (misma ingesta que atc_cache).
-- Permite cross-link "mismo principio activo" sin N+1 ni llamadas CIMA adicionales.

CREATE TABLE IF NOT EXISTS pa_cache (
  principio TEXT NOT NULL,
  nregistro TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (principio, nregistro)
);

CREATE INDEX IF NOT EXISTS idx_pa_cache_principio ON pa_cache (principio);
