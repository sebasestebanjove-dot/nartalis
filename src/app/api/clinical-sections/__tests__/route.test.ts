import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies at top level
vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}))

import { sql } from '@/lib/db'
const mockSql = vi.mocked(sql)

// Shared mock row for tests
const mockGoodRow = {
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
}

const mockPartialRow = { ...mockGoodRow, quality_class: 'partial' as const }
const mockPoorRow = { ...mockGoodRow, quality_class: 'poor' as const }
const mockUnreadableRow = { ...mockGoodRow, quality_class: 'unreadable' as const }

describe('GET /api/clinical-sections (public)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when nregistro is missing', async () => {
    const req = new NextRequest(new Request('http://localhost/api/clinical-sections'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Parámetro nregistro requerido')
  })

  it('should return 400 when nregistro format is invalid', async () => {
    const req = new NextRequest(new Request('http://localhost/api/clinical-sections?nregistro=invalid!'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Formato de nregistro inválido')
  })

  it('should return 404 when nregistro not found', async () => {
    mockSql.mockResolvedValue([])

    const req = new NextRequest(new Request('http://localhost/api/clinical-sections?nregistro=999999'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(404)
  })

  it('should return 404 when quality is PARTIAL', async () => {
    mockSql.mockResolvedValue([mockPartialRow])

    const req = new NextRequest(new Request('http://localhost/api/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(404)
  })

  it('should return 404 when quality is POOR', async () => {
    mockSql.mockResolvedValue([mockPoorRow])

    const req = new NextRequest(new Request('http://localhost/api/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(404)
  })

  it('should return 404 when quality is UNREADABLE', async () => {
    mockSql.mockResolvedValue([mockUnreadableRow])

    const req = new NextRequest(new Request('http://localhost/api/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(404)
  })

  it('should return 200 with clinical data when quality is GOOD', async () => {
    mockSql.mockResolvedValue([mockGoodRow])

    const req = new NextRequest(new Request('http://localhost/api/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.nregistro).toBe('123456')
    expect(body.source.name).toBe('CIMA_AEMPS')
    expect(body.document.documentType).toBe('ficha_tecnica')
    expect(body.clinical.indicaciones).toBe('Indicaciones terapéuticas del medicamento...')
    expect(body.clinical.administracion).toBeNull()
    // Ensure no internal data is leaked
    expect(body.confidence).toBeUndefined()
    expect(body.sections_found).toBeUndefined()
    expect(body.quality_class).toBeUndefined()
    expect(body.extracted_at).toBeUndefined()
    expect(body.pdf_hash).toBeUndefined()
    expect(body.raw_text_length).toBeUndefined()
    expect(body.normalized_text_length).toBeUndefined()
    expect(body.scanned_detected).toBeUndefined()
    expect(body.table_structure_loss).toBeUndefined()
  })

  it('should return 500 on database error', async () => {
    mockSql.mockRejectedValue(new Error('DB connection failed'))

    const req = new NextRequest(new Request('http://localhost/api/clinical-sections?nregistro=123456'))
    const { GET } = await import('../route')
    const response = await GET(req)
    expect(response.status).toBe(500)
  })
})