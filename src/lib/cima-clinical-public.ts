import { sql } from '@/lib/db'

const NREGISTRO_RE = /^[A-Za-z0-9]{1,20}$/

export interface ClinicalDataForJsonLd {
  indicaciones: string | null
  contraindicaciones: string | null
  advertencias: string | null
  posologia: string | null
  administracion: string | null
  efectosAdversos: string | null
  interacciones: string | null
  embarazoLactancia: string | null
  conduccion: string | null
  composicion: string | null
  excipientes: string | null
  documentType: string
  sourceUrl: string
  extractedAt: string
  nregistro: string
}

export async function getClinicalDataForJsonLd(nregistro: string): Promise<ClinicalDataForJsonLd | null> {
  if (!NREGISTRO_RE.test(nregistro)) {
    return null
  }

  try {
    const rows = await sql`
      SELECT * FROM nartalis_cima_clinical_sections
      WHERE nregistro = ${nregistro}
      ORDER BY extracted_at DESC
    `

    if (!rows.length) {
      return null
    }

    const row = rows[0]

    if (row.quality_class !== 'good') {
      return null
    }

    return {
      nregistro: row.nregistro,
      documentType: row.document_type,
      sourceUrl: row.source_url,
      extractedAt: row.extracted_at,
      indicaciones: row.indicaciones ?? null,
      contraindicaciones: row.contraindicaciones ?? null,
      advertencias: row.advertencias ?? null,
      posologia: row.posologia ?? null,
      administracion: row.administracion ?? null,
      efectosAdversos: row.efectos_adversos ?? null,
      interacciones: row.interacciones ?? null,
      embarazoLactancia: row.embarazo_lactancia ?? null,
      conduccion: row.conduccion ?? null,
      composicion: row.composicion ?? null,
      excipientes: row.excipientes ?? null,
    }
  } catch (e) {
    console.error('Error fetching clinical data for JSON-LD:', e)
    return null
  }
}

interface JsonLdNode {
  '@type': string
  name: string
  description: string
}

export function buildClinicalJsonLd(clinical: ClinicalDataForJsonLd): JsonLdNode[] {
  const jsonLdNodes: JsonLdNode[] = []

  if (clinical.indicaciones) {
    jsonLdNodes.push({
      '@type': 'MedicalIndication',
      name: 'Indicaciones terapéuticas',
      description: clinical.indicaciones,
    })
  }

  if (clinical.contraindicaciones) {
    jsonLdNodes.push({
      '@type': 'MedicalContraindication',
      name: 'Contraindicaciones',
      description: clinical.contraindicaciones,
    })
  }

  if (clinical.administracion) {
    jsonLdNodes.push({
      '@type': 'DrugRoute',
      name: 'Vía de administración',
      description: clinical.administracion,
    })
  }

  return jsonLdNodes
}