import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}))

import { sql } from '@/lib/db'
const mockSql = vi.mocked(sql)

import { getClinicalDataForJsonLd, buildClinicalJsonLd, type ClinicalDataForJsonLd } from '../cima-clinical-public'

describe('cima-clinical-public', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockGoodRow = {
    nregistro: '123456',
    document_type: 'ficha_tecnica',
    source_url: 'https://cima.aemps.es/cima/pdfs/ft/123/FT_123.pdf',
    extracted_at: '2024-01-15T10:00:00.000Z',
    quality_class: 'good' as const,
    indicaciones: 'Indicaciones terapéuticas del medicamento...',
    contraindicaciones: 'Contraindicaciones del medicamento...',
    advertencias: 'Advertencias y precauciones...',
    posologia: 'Posología recomendada...',
    administracion: 'Vía oral',
    efectos_adversos: 'Efectos adversos frecuentes...',
    interacciones: 'Interacciones con otros medicamentos...',
    embarazo_lactancia: 'No recomendado en embarazo...',
    conduccion: 'Puede afectar la capacidad de conducir',
    composicion: 'Cada comprimido contiene 500mg de principio activo...',
    excipientes: 'Excipiente: lactosa, almidón...',
  }

  const mockPartialRow = { ...mockGoodRow, quality_class: 'partial' as const }

  describe('getClinicalDataForJsonLd', () => {
    it('should return null for invalid nregistro format', async () => {
      const result = await getClinicalDataForJsonLd('invalid!')
      expect(result).toBeNull()
    })

    it('should return null when nregistro not found', async () => {
      mockSql.mockResolvedValue([])
      const result = await getClinicalDataForJsonLd('999999')
      expect(result).toBeNull()
    })

    it('should return null when quality is PARTIAL', async () => {
      mockSql.mockResolvedValue([mockPartialRow])
      const result = await getClinicalDataForJsonLd('123456')
      expect(result).toBeNull()
    })

    it('should return clinical data when quality is GOOD', async () => {
      mockSql.mockResolvedValue([mockGoodRow])
      const result = await getClinicalDataForJsonLd('123456')
      
      expect(result).not.toBeNull()
      expect(result?.nregistro).toBe('123456')
      expect(result?.documentType).toBe('ficha_tecnica')
      expect(result?.indicaciones).toBe('Indicaciones terapéuticas del medicamento...')
      expect(result?.contraindicaciones).toBe('Contraindicaciones del medicamento...')
      expect(result?.advertencias).toBe('Advertencias y precauciones...')
      expect(result?.posologia).toBe('Posología recomendada...')
      expect(result?.administracion).toBe('Vía oral')
      expect(result?.efectosAdversos).toBe('Efectos adversos frecuentes...')
      expect(result?.interacciones).toBe('Interacciones con otros medicamentos...')
      expect(result?.embarazoLactancia).toBe('No recomendado en embarazo...')
      expect(result?.conduccion).toBe('Puede afectar la capacidad de conducir')
      expect(result?.composicion).toBe('Cada comprimido contiene 500mg de principio activo...')
      expect(result?.excipientes).toBe('Excipiente: lactosa, almidón...')
    })

    it('should return null on database error', async () => {
      mockSql.mockRejectedValue(new Error('DB error'))
      const result = await getClinicalDataForJsonLd('123456')
      expect(result).toBeNull()
    })
  })

  describe('buildClinicalJsonLd', () => {
    const clinicalData: ClinicalDataForJsonLd = {
      nregistro: '123456',
      documentType: 'ficha_tecnica',
      sourceUrl: 'https://cima.aemps.es/cima/pdfs/ft/123/FT_123.pdf',
      extractedAt: '2024-01-15T10:00:00.000Z',
      indicaciones: 'Indicaciones terapéuticas...',
      contraindicaciones: 'Contraindicaciones...',
      advertencias: 'Advertencias...',
      posologia: 'Posología...',
      administracion: 'Vía oral',
      efectosAdversos: 'Efectos adversos...',
      interacciones: 'Interacciones...',
      embarazoLactancia: 'Embarazo...',
      conduccion: 'Conducción...',
      composicion: 'Composición...',
      excipientes: 'Excipientes...',
    }

    it('should build JSON-LD nodes only for semantically correct fields', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      
      // Only 2 nodes: MedicalIndication, MedicalContraindication
      expect(nodes.length).toBe(2)
      
      const types = nodes.map(n => n['@type'])
      expect(types).toContain('MedicalIndication')
      expect(types).toContain('MedicalContraindication')
      
      // DrugRoute must NOT be used (administrationRoute is Text in Drug)
      expect(types).not.toContain('DrugRoute')
      
      // DrugStrength must NOT be used for posologia, composicion, excipientes
      expect(types).not.toContain('DrugStrength')
      
      // MedicalEntity must NOT be used as generic container
      expect(types).not.toContain('MedicalEntity')
    })

    it('should not include nodes for null fields', () => {
      const partialData: ClinicalDataForJsonLd = {
        ...clinicalData,
        administracion: null,
      }
      
      const nodes = buildClinicalJsonLd(partialData)
      expect(nodes.length).toBe(2)
      
      const names = nodes.map(n => n.name)
      expect(names).not.toContain('Vía de administración')
    })

    it('should create MedicalIndication with correct structure', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const indication = nodes.find(n => n['@type'] === 'MedicalIndication')
      
      expect(indication).toBeDefined()
      expect(indication?.name).toBe('Indicaciones terapéuticas')
      expect(indication?.description).toBe('Indicaciones terapéuticas...')
    })

    it('should create MedicalContraindication for contraindicaciones', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const contraindication = nodes.find(n => n['@type'] === 'MedicalContraindication' && n.name === 'Contraindicaciones')
      
      expect(contraindication).toBeDefined()
      expect(contraindication?.description).toBe('Contraindicaciones...')
    })

    it('should NOT create MedicalContraindication for advertencias', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const warning = nodes.find(n => n['@type'] === 'MedicalContraindication' && n.name === 'Advertencias y precauciones especiales de empleo')
      
      expect(warning).toBeUndefined()
    })

    it('should NOT create DrugStrength for posologia', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const strength = nodes.find(n => n['@type'] === 'DrugStrength' && n.name === 'Posología')
      
      expect(strength).toBeUndefined()
    })

    it('should NOT create DrugRoute for administracion (administrationRoute is Text in Drug)', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const route = nodes.find(n => n['@type'] === 'DrugRoute')
      
      expect(route).toBeUndefined()
    })

    it('should NOT create MedicalEntity for efectosAdversos', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const entity = nodes.find(n => n['@type'] === 'MedicalEntity' && n.name === 'Efectos adversos')
      
      expect(entity).toBeUndefined()
    })

    it('should NOT create MedicalEntity for interacciones', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const entity = nodes.find(n => n['@type'] === 'MedicalEntity' && n.name === 'Interacciones')
      
      expect(entity).toBeUndefined()
    })

    it('should NOT create MedicalEntity for embarazoLactancia', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const entity = nodes.find(n => n['@type'] === 'MedicalEntity' && n.name === 'Embarazo y lactancia')
      
      expect(entity).toBeUndefined()
    })

    it('should NOT create MedicalEntity for conduccion', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const entity = nodes.find(n => n['@type'] === 'MedicalEntity' && n.name === 'Efectos sobre la capacidad de conducir')
      
      expect(entity).toBeUndefined()
    })

    it('should NOT create DrugStrength for composicion', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const strength = nodes.find(n => n['@type'] === 'DrugStrength' && n.name === 'Composición')
      
      expect(strength).toBeUndefined()
    })

    it('should NOT create DrugStrength for excipientes', () => {
      const nodes = buildClinicalJsonLd(clinicalData)
      const strength = nodes.find(n => n['@type'] === 'DrugStrength' && n.name === 'Excipientes')
      
      expect(strength).toBeUndefined()
    })
  })
})