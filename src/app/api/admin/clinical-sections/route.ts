import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, adminUnauthorized } from '@/lib/admin'

const NREGISTRO_RE = /^[A-Za-z0-9]{1,20}$/

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json(
      { error: adminUnauthorized(guard.reason).error },
      { status: adminUnauthorized(guard.reason).status }
    )
  }

  const sp = req.nextUrl.searchParams
  const nregistroRaw = sp.get('nregistro')

  if (!nregistroRaw) {
    return NextResponse.json(
      { error: 'Parámetro nregistro requerido' },
      { status: 400 }
    )
  }

  if (!NREGISTRO_RE.test(nregistroRaw)) {
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

    const quality = {
      status: row.quality_class,
      score: row.confidence ? Math.round(row.confidence * 100) : null,
      warnings: row.warnings ?? [],
    }

    const validation = {
      sectionsFound: row.sections_found ?? [],
      sectionsMissing: row.sections_missing ?? [],
      qualityClass: row.quality_class,
      confidence: row.confidence ? Math.round(row.confidence * 100) : null,
      scannedDetected: row.scanned_detected,
      tableStructureLoss: row.table_structure_loss,
      warnings: row.warnings ?? [],
    }

    const traceability = {
      nregistro: row.nregistro,
      documentType: row.document_type,
      sourceUrl: row.source_url,
      sourceHash: row.source_hash,
      pdfHash: row.pdf_hash,
      extractedAt: row.extracted_at,
      cimaRevisionDate: row.cima_revision_date,
      pageCount: row.page_count,
      pdfBytes: row.pdf_bytes,
      rawTextLength: row.raw_text_length,
      normalizedTextLength: row.normalized_text_length,
      extractionMethod: row.extraction_method,
    }

    return NextResponse.json({
      nregistro: row.nregistro,
      source: 'CIMA_AEMPS',
      document: {
        documentType: row.document_type,
        documentHash: row.source_hash,
        sourceUrl: row.source_url,
        extractedAt: row.extracted_at,
      },
      quality,
      clinical,
      validation,
      traceability,
    })
  } catch (e) {
    console.error('Error fetching clinical sections:', e)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}