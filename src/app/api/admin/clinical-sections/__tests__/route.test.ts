import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies at top level
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}))

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
  adminUnauthorized: vi.fn((reason: 'no_session' | 'forbidden') => 
    reason === 'forbidden' 
      ? { error: 'Forbidden', status: 403 }
      : { error: 'No autorizado', status: 401 }
  ),
}))

vi.mock('@/lib/cima-clinical-validation', () => ({
  validateClinicalExtraction: vi.fn(),
}))

// Import mocked modules
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'

const mockSql = vi.mocked(sql)
const mockRequireAdmin = vi.mocked(requireAdmin)

// Shared mock row for tests
const mockRow = {
  id: 'test-id',
  nregistro: '123456',
  document_type: 'ficha_tecnica',
  source_url: 'https://cima.aemps.es/cima/pdfs/ft/123/FT_123.pdf',
  source_hash: 'abc123',
  extracted_at: new Date().toISOString(),
  cima_revision_date: null,
  page_count: 5,
  pdf_bytes: 1024,
  raw_text_length: 5000,
  normalized_text_length: 4500,
  extraction_method: 'pdfjs',
  quality_class: 'good' as const,
  confidence: 0.95,
  scanned_detected: false,
  table_structure_loss: false,
  sections_found: ['indicaciones', 'contraindicaciones', 'posologia'],
  sections_missing: ['administracion'],
  warnings: [],
  pdf_hash: 'abc123hash',
  indicaciones: 'Indicaciones terapéuticas del medicamento...',
  contraindicaciones: 'Contraindicaciones del medicamento...',
  advertencias: 'Advertencias y precauciones...',
  posologia: 'Posología recomendada...',
  administracion: null,
  efectos_adversos: 'Efectos adversos...',
  interacciones: 'Interacciones medicamentosas...',
  embarazo_lactancia: 'Embarazo y lactancia...',
  conduccion: 'Conducción...',
  composicion: 'Composición cualitativa...',
  excipientes: null,
  source_url: 'https://cima.aemps.es/cima/pdfs/ft/123/FT_123.pdf',
  source_hash: 'sourcehash123',
  extracted_at: new Date().toISOString(),
  cima_revision_date: null,
  page_count: 5,
  pdf_bytes: 1024,
  raw_text_length: 5000,
  normalized_text_length: 4500,
  extraction_method: 'pdfjs',
  quality_class: 'good' as const,
  confidence: 0.95,
  scanned_detected: false,
  table_structure_loss: false,
  sections_found: ['indicaciones', 'contraindicaciones', 'posologia'],
  sections_missing: ['administracion'],
  warnings: [],
  pdf_hash: 'abc123hash',
}

describe('GET /api/admin/clinical-sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when nregistro is missing', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, user: { role: 'ADMIN' } })

    const req = new NextRequest(new Request('http://localhost/api/admin/clinical-sections'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Parámetro nregistro requerido')
  })

  it('should return 400 when nregistro format is invalid', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, user: { role: 'ADMIN' } })

    const req = new NextRequest(new Request('http://localhost/api/admin/clinical-sections?nregistro=invalid!'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Formato de nregistro inválido')
  })

  it('should return 401 when user is not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: false, reason: 'no_session' })

    const req = new NextRequest(new Request('http://localhost/api/admin/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('should return 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })

    const req = new NextRequest(new Request('http://localhost/api/admin/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(403)
  })

  it('should return 404 when nregistro not found', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, user: { role: 'ADMIN' } })
    mockSql.mockResolvedValue([])

    const req = new NextRequest(new Request('http://localhost/api/admin/clinical-sections?nregistro=999999'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(404)
  })

  it('should return 200 with clinical data when nregistro exists', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, user: { role: 'ADMIN' } })
    mockSql.mockResolvedValue([mockRow])

    const req = new NextRequest(new Request('http://localhost/api/admin/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.nregistro).toBe('123456')
    expect(body.source).toBe('CIMA_AEMPS')
    expect(body.document.documentType).toBe('ficha_tecnica')
    expect(body.quality.status).toBe('good')
    expect(body.clinical.indicaciones).toBe('Indicaciones terapéuticas del medicamento...')
    expect(body.clinical.administracion).toBeNull()
    expect(body.validation.qualityClass).toBe('good')
    expect(body.validation.sectionsFound).toContain('indicaciones')
    expect(body.validation.sectionsMissing).toContain('administracion')
    expect(body.traceability.nregistro).toBe('123456')
  })

  it('should return 500 on database error', async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, user: { role: 'ADMIN' } })
    mockSql.mockRejectedValue(new Error('DB connection failed'))

    const req = new NextRequest(new Request('http://localhost/api/admin/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(500)
  })
})