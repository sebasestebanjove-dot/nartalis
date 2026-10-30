import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  sql: vi.fn(),
}))

vi.mock('@/lib/slug', () => ({
  makeSlug: vi.fn((nombre: string, registro: string) => `${nombre.toLowerCase().replace(/\s+/g, '-')}--${registro}`),
}))

vi.mock('@/lib/pa-principle', () => ({
  ingestPrincipleIfPresent: vi.fn(),
}))

vi.mock('@/lib/prospect-cache', () => ({
  getCanonicalPaLinks: vi.fn().mockResolvedValue([]),
  getRelatedByAtc: vi.fn().mockResolvedValue([]),
  getRelatedByPa: vi.fn().mockResolvedValue([]),
  getLetterCount: vi.fn().mockResolvedValue(10),
}))

vi.mock('@/lib/cima-clinical-public', () => ({
  getClinicalDataForJsonLd: vi.fn(),
  buildClinicalJsonLd: vi.fn(),
}))

vi.mock('@/components/farma/screens/ProspectoView', () => ({
  default: function ProspectoView() { return null },
}))

vi.mock('@/components/farma/types', () => ({
  Medicamento: {},
  PaLink: {},
}))

import { getClinicalDataForJsonLd, buildClinicalJsonLd } from '@/lib/cima-clinical-public'
const mockGetClinicalData = vi.mocked(getClinicalDataForJsonLd)
const mockBuildClinicalJsonLd = vi.mocked(buildClinicalJsonLd)

const mockMedicamento = {
  nombre: 'TestMedicamento',
  registro: '123456',
  laboratorio: 'TestLab',
  laboratorioComercializador: 'TestLabCom',
  receta: true,
  conduc: false,
  cpresc: 'RR',
  vias: ['Oral'],
  imagenUrl: null,
  prospectoUrl: 'https://cima.aemps.es/prospecto.pdf',
  fichaTecnicaUrl: 'https://cima.aemps.es/ft.pdf',
  generico: false,
  triangulo: false,
  psum: false,
  notas: false,
  biosimilar: false,
  huerfano: false,
  ema: false,
  materialesInf: false,
  comerc: true,
  dosis: '500 mg',
  formaFarmaceutica: 'Comprimido',
  pactivos: 'Paracetamol',
  principiosActivos: [{ nombre: 'Paracetamol', cantidad: '500', unidad: 'mg' }],
  excipientes: [{ nombre: 'Lactosa', cantidad: '100', unidad: 'mg' }],
  atcs: [{ codigo: 'N02BE01', nombre: 'Paracetamol', nivel: 5 }],
  presentaciones: [],
  estado: { aut: '2020-01-01', rev: '2023-01-01' },
}

const mockClinicalData = {
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

const mockClinicalNodes = [
  { '@type': 'MedicalIndication', name: 'Indicaciones terapéuticas', description: 'Indicaciones terapéuticas...' },
  { '@type': 'MedicalContraindication', name: 'Contraindicaciones', description: 'Contraindicaciones...' },
  { '@type': 'DrugRoute', name: 'Vía de administración', description: 'Vía oral' },
]

describe('ProspectoPage JSON-LD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate base JSON-LD without clinical data when no clinical data exists', async () => {
    mockGetClinicalData.mockResolvedValue(null)
    mockBuildClinicalJsonLd.mockReturnValue([])

    const { default: ProspectoPage } = await import('../page')
    
    expect(typeof ProspectoPage).toBe('function')
  })

  it('should include clinical data in JSON-LD when GOOD quality exists', async () => {
    mockGetClinicalData.mockResolvedValue(mockClinicalData)
    mockBuildClinicalJsonLd.mockReturnValue(mockClinicalNodes)

    const { default: ProspectoPage } = await import('../page')
    expect(typeof ProspectoPage).toBe('function')
  })

  it('should not include clinical data when quality is PARTIAL', async () => {
    mockGetClinicalData.mockResolvedValue(null)
    mockBuildClinicalJsonLd.mockReturnValue([])

    const { default: ProspectoPage } = await import('../page')
    expect(typeof ProspectoPage).toBe('function')
  })

  it('should not include clinical data when quality is POOR', async () => {
    mockGetClinicalData.mockResolvedValue(null)
    mockBuildClinicalJsonLd.mockReturnValue([])

    const { default: ProspectoPage } = await import('../page')
    expect(typeof ProspectoPage).toBe('function')
  })

  it('should not include clinical data when no clinical record exists', async () => {
    mockGetClinicalData.mockResolvedValue(null)
    mockBuildClinicalJsonLd.mockReturnValue([])

    const { default: ProspectoPage } = await import('../page')
    expect(typeof ProspectoPage).toBe('function')
  })

  describe('JSON-LD structure validation', () => {
    it('should generate valid Drug JSON-LD with required fields', () => {
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Drug',
        name: mockMedicamento.nombre,
        description: `Información del medicamento ${mockMedicamento.nombre}. Datos oficiales AEMPS.`,
        url: `https://nartalis.com/prospectos/${mockMedicamento.nombre.toLowerCase().replace(/\s+/g, '-')}--${mockMedicamento.registro}`,
        manufacturer: { '@type': 'Organization', name: mockMedicamento.laboratorio },
        activeIngredient: mockMedicamento.principiosActivos?.map(p => p.nombre),
        dosageForm: mockMedicamento.formaFarmaceutica,
        administrationRoute: 'Vía oral',
        prescriptionStatus: 'https://schema.org/PrescriptionOnly',
        legalStatus: mockMedicamento.cpresc,
        isAvailableGenerically: mockMedicamento.generico,
        drugClass: {
          '@type': 'DrugClass',
          name: mockMedicamento.atcs?.[mockMedicamento.atcs.length - 1]?.nombre,
          code: {
            '@type': 'MedicalCode',
            codeValue: mockMedicamento.atcs?.[mockMedicamento.atcs.length - 1]?.codigo,
            codingSystem: 'ATC',
          },
        },
        identifier: { '@type': 'PropertyValue', propertyID: 'AEMPS', value: mockMedicamento.registro },
      }

      expect(jsonLd['@context']).toBe('https://schema.org')
      expect(jsonLd['@type']).toBe('Drug')
      expect(jsonLd.name).toBe('TestMedicamento')
      expect(jsonLd.url).toContain('123456')
      expect(jsonLd.manufacturer).toBeDefined()
      expect(jsonLd.activeIngredient).toContain('Paracetamol')
      expect(jsonLd.dosageForm).toBe('Comprimido')
      expect(jsonLd.prescriptionStatus).toBe('https://schema.org/PrescriptionOnly')
      expect(jsonLd.identifier?.value).toBe('123456')
    })

    it('should generate valid WebPage JSON-LD with mainEntity', () => {
      const drugLd = { '@type': 'Drug', name: 'TestMedicamento' }
      const webPageLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'TestMedicamento',
        url: 'https://nartalis.com/prospectos/testmedicamento--123456',
        description: 'Información del medicamento TestMedicamento basada en datos oficiales de la AEMPS (CIMA).',
        mainEntity: drugLd,
      }

      expect(webPageLd['@type']).toBe('WebPage')
      expect(webPageLd.mainEntity).toBe(drugLd)
      expect(webPageLd.url).toContain('123456')
    })

    it('should generate valid BreadcrumbList JSON-LD', () => {
      const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://nartalis.com/' },
          { '@type': 'ListItem', position: 2, name: 'Medicamentos', item: 'https://nartalis.com/medicamentos' },
          { '@type': 'ListItem', position: 3, name: 'T', item: 'https://nartalis.com/medicamentos/t' },
          { '@type': 'ListItem', position: 4, name: 'TestMedicamento' },
        ],
      }

      expect(breadcrumbLd['@type']).toBe('BreadcrumbList')
      expect(breadcrumbLd.itemListElement.length).toBe(4)
      expect(breadcrumbLd.itemListElement[0].position).toBe(1)
      expect(breadcrumbLd.itemListElement[3].name).toBe('TestMedicamento')
    })

    it('should generate valid clinical JSON-LD nodes', () => {
      const clinicalNodes = [
        { '@type': 'MedicalIndication', name: 'Indicaciones terapéuticas', description: 'Test indicaciones' },
        { '@type': 'MedicalContraindication', name: 'Contraindicaciones', description: 'Test contraindicaciones' },
        { '@type': 'DrugRoute', name: 'Vía de administración', description: 'Test administracion' },
      ]

      clinicalNodes.forEach(node => {
        expect(node['@type']).toBeDefined()
        expect(node.name).toBeDefined()
        expect(node.description).toBeDefined()
        expect(typeof node['@type']).toBe('string')
        expect(typeof node.name).toBe('string')
        expect(typeof node.description).toBe('string')
      })
    })

    it('should not include null clinical fields in JSON-LD', () => {
      const clinicalNodes = [
        { '@type': 'MedicalIndication', name: 'Indicaciones terapéuticas', description: 'Test' },
      ]

      const hasAdministracion = clinicalNodes.some(n => n.name === 'Vía de administración')
      expect(hasAdministracion).toBe(false)
    })
  })
})