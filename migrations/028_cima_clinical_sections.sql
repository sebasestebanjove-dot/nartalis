-- Nartalis - Fase 2A: Tabla de secciones clínicas extraídas de CIMA/AEMPS.
-- Almacena el texto extraído de PDFs CIMA con trazabilidad completa y versionado por hash.
-- No modifica ni resume el contenido original.
-- Idempotente: NO borra ni modifica datos existentes.

BEGIN;

CREATE TABLE IF NOT EXISTS nartalis_cima_clinical_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nregistro TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('prospecto', 'ficha_tecnica', 'ipe', 'english_smpc')),
    source_url TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    extracted_at TIMESTAMP DEFAULT NOW(),
    cima_revision_date TIMESTAMP,
    page_count INTEGER,
    pdf_bytes BIGINT,
    raw_text_length BIGINT,
    normalized_text_length BIGINT,
    extraction_method TEXT NOT NULL DEFAULT 'pdfjs',
    quality_class TEXT NOT NULL CHECK (quality_class IN ('good', 'partial', 'poor', 'unreadable')),
    confidence NUMERIC(4,2),
    scanned_detected BOOLEAN DEFAULT FALSE,
    table_structure_loss BOOLEAN DEFAULT FALSE,
    sections_found TEXT[],
    sections_missing TEXT[],
    warnings TEXT[],
    pdf_hash TEXT NOT NULL,
    -- Campos clínicos (texto original sin modificar)
    indicaciones TEXT,
    contraindicaciones TEXT,
    advertencias TEXT,
    posologia TEXT,
    administracion TEXT,
    efectos_adversos TEXT,
    interacciones TEXT,
    embarazo_lactancia TEXT,
    conduccion TEXT,
    excipientes TEXT,
    composicion TEXT,
    -- Metadatos de control
    extracted_at TIMESTAMP DEFAULT NOW(),
    traceability JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice único para versionado: nregistro + document_type + source_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_cima_clinical_unique_version
    ON nartalis_cima_clinical_sections (nregistro, document_type, source_hash);

-- Índices para consultas comunes
CREATE INDEX IF NOT EXISTS idx_cima_clinical_nregistro ON nartalis_cima_clinical_sections (nregistro);
CREATE INDEX IF NOT EXISTS idx_cima_clinical_document_type ON nartalis_cima_clinical_sections (document_type);
CREATE INDEX IF NOT EXISTS idx_cima_clinical_pdf_hash ON nartalis_cima_clinical_sections (pdf_hash);
CREATE INDEX IF NOT EXISTS idx_cima_clinical_quality_class ON nartalis_cima_clinical_sections (quality_class);
CREATE INDEX IF NOT EXISTS idx_cima_clinical_extracted_at ON nartalis_cima_clinical_sections (extracted_at);
CREATE INDEX IF NOT EXISTS idx_cima_clinical_cima_revision ON nartalis_cima_clinical_sections (cima_revision_date);

-- Comentarios para documentación
COMMENT ON TABLE nartalis_cima_clinical_sections IS 'Secciones clínicas extraídas de PDFs CIMA/AEMPS con trazabilidad completa y versionado por hash. No se modifica el contenido original.';
COMMENT ON COLUMN nartalis_cima_clinical_sections.source_hash IS 'Hash SHA-256 del contenido del documento CIMA (para deduplicación y detección de cambios).';
COMMENT ON COLUMN nartalis_cima_clinical_sections.pdf_hash IS 'Hash SHA-256 del PDF binario (para deduplicación de PDFs idénticos).';
COMMENT ON COLUMN nartalis_cima_clinical_sections.quality_class IS 'Clasificación de calidad: good (publicable), partial (usable con reservas), poor (dudoso), unreadable (no legible/escaneado).';
COMMENT ON COLUMN nartalis_cima_clinical_sections.scanned_detected IS 'True si el PDF parece escaneado (requiere OCR).';
COMMENT ON COLUMN nartalis_cima_clinical_sections.table_structure_loss IS 'True si se detectó posible pérdida de estructura tabular (posología, tablas).';
COMMENT ON COLUMN nartalis_cima_clinical_sections.sections_found IS 'Array con las claves de las secciones detectadas con éxito.';
COMMENT ON COLUMN nartalis_cima_clinical_sections.sections_missing IS 'Array con las claves de las secciones esperadas pero no detectadas.';
COMMENT ON COLUMN nartalis_cima_clinical_sections.warnings IS 'Array de advertencias durante la extracción (texto corto, tabla perdida, etc.).';
COMMENT ON COLUMN nartalis_cima_clinical_sections.traceability IS 'JSON con trazabilidad completa: source_url, pdf_hash, extracted_at, extraction_method, etc.';

COMMIT;