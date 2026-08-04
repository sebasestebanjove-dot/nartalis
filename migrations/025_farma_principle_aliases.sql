-- Nartalis - SEO FASE 2A.2: aliases de principios activos para redirects.
-- Solo se insertan EQUIVALENCIAS DEMOSTRADAS e inequívocas hacia una entidad
-- canónica. Los términos-paraguas sin vtm único activo NO se incluyen.
-- Idempotente y seguro. NO borra entidades ni pa_cache.
--
-- Uso (FASE 2B): /principios-activos/<alias> -> 301 -> /principios-activos/<slug destino>
-- Los aliases NUNCA generan páginas indexables propias.

CREATE TABLE IF NOT EXISTS farma_principle_aliases (
  alias TEXT PRIMARY KEY,
  principle_id BIGINT NOT NULL REFERENCES farma_principles(id) ON DELETE CASCADE,
  normalized_key TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT farma_principle_aliases_principle_id_nk UNIQUE (principle_id, normalized_key)
);

CREATE INDEX IF NOT EXISTS idx_farma_principle_aliases_nk ON farma_principle_aliases (normalized_key);

-- Equivalencias demostradas por la auditoría FASE 2A.2 (destino indexable):
INSERT INTO farma_principle_aliases (alias, normalized_key, principle_id)
SELECT 'aspirina', 'aspirina', id FROM farma_principles WHERE slug = 'acido-acetilsalicilico'
ON CONFLICT (alias) DO UPDATE SET principle_id = EXCLUDED.principle_id, normalized_key = EXCLUDED.normalized_key;

INSERT INTO farma_principle_aliases (alias, normalized_key, principle_id)
SELECT 'vitamina-b12', 'vitaminab12', id FROM farma_principles WHERE slug = 'cianocobalamina'
ON CONFLICT (alias) DO UPDATE SET principle_id = EXCLUDED.principle_id, normalized_key = EXCLUDED.normalized_key;

INSERT INTO farma_principle_aliases (alias, normalized_key, principle_id)
SELECT 'cobalamina', 'cobalamina', id FROM farma_principles WHERE slug = 'cianocobalamina'
ON CONFLICT (alias) DO UPDATE SET principle_id = EXCLUDED.principle_id, normalized_key = EXCLUDED.normalized_key;