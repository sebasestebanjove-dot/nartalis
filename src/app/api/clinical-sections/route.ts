import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { ClinicalPublicResponse } from '@/lib/pdf-parse/types'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams
  const nregistroRaw = sp.get('nregistro')

  if (!nregistroRaw) {
    return NextResponse.json(
      { error: 'Parámetro nregistro requerido' },
      { status: 400 }
    )
  }

  if (!/^[A-Za-z0-9]{1,20}$/.test(nregistroRaw)) {
    return NextResponse.json(
      { error: 'Formato de nregistro inválido' },
      { status: 400 }
    )
  }

  try {
    const rows = await sql`
      SELECT * FROM nartalis_cima_clinical_sections
      WHERE nregistro = ${nregistroRaw}
      ORDER BY extracted_at DESC
    `

    if (!rows.length) {
      return NextResponse.json(
        { error: 'No se encontraron secciones clínicas para este nregistro' },
        { status: 404 }
      )
    }

    // Get the latest version (most recent extracted_at)
    const row = rows[0]

    // Quality gate: only return data for GOOD quality
    if (row.quality_class !== 'good') {
      return NextResponse.json(
        { error: 'No se encontraron secciones clínicas publicables para este nregistro' },
        { status: 404 }
      )
    }

    const clinical = {
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

    const response: ClinicalPublicResponse = {
      nregistro: row.nregistro,
      source: { name: 'CIMA_AEMPS' },
      document: {
        documentType: row.document_type,
        documentHash: row.source_hash,
        sourceUrl: row.source_url,
        extractedAt: row.extracted_at,
      },
      clinical,
    }

    return NextResponse.json(response)
  } catch (e) {
    console.error('Error fetching clinical sections:', e)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}