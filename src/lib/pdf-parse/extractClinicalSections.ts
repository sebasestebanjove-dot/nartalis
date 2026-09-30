import { 
  extractPdfTextFromBuffer, 
  extractPdfTextFromFile, 
  calculatePdfHash,
  PdfJsExtractionResult 
} from './extractPdfText';
import { fullNormalize, buildPageBreakMap, getPageForIndex } from './normalizePdfText';
import { 
  getSectionPatterns, 
  detectDocumentType, 
  isLikelySectionHeader,
  normalizeTitle,
  SectionPattern 
} from './sectionPatterns';
import type {
  CimaClinicalExtraction,
  CimaDocumentType,
  CimaSectionKey,
  ClinicalSection,
  QualityReport,
  SectionMatch,
} from './types';

export function findSectionBoundaries(
  normalizedText: string,
  pageTexts: string[],
  documentType: CimaDocumentType
): SectionMatch[] {
  const patterns = getSectionPatterns(documentType);
  const pageBreaks = buildPageBreakMap(pageTexts);
  const matches: SectionMatch[] = [];

  const textUpper = normalizedText.toUpperCase();

  for (const section of patterns) {
    let bestMatch: SectionMatch | null = null;

    for (const pattern of section.patterns) {
      let match;
      const regex = new RegExp(pattern.source, 'gi');
      while ((match = regex.exec(textUpper)) !== null) {
        const startIndex = match.index;
        const titleOriginal = match[0];
        const confidence = calculateMatchConfidence(titleOriginal, section, documentType);

        const endIndex = findSectionEnd(normalizedText, startIndex, patterns, section.key);

        const startPage = getPageForIndex(normalizedText, startIndex, buildPageBreakMap(pageTexts));
        const endPage = getPageForIndex(normalizedText, endIndex, buildPageBreakMap(pageTexts));

        const candidate: SectionMatch = {
          sectionKey: section.key,
          titleOriginal: titleOriginal.trim(),
          startIndex,
          endIndex,
          startPage,
          endPage,
          confidence,
        };

        if (!bestMatch || candidate.confidence > bestMatch.confidence) {
          bestMatch = candidate;
        }

        if (!regex.global) break;
      }
    }

    if (bestMatch && bestMatch.confidence > 0.3) {
      matches.push(bestMatch);
    }
  }

  matches.sort((a, b) => a.startIndex - b.startIndex);
  return deduplicateMatches(matches);
}

export function calculateMatchConfidence(
  matchedText: string,
  section: SectionPattern,
  documentType: CimaDocumentType
): number {
  let confidence = 0.5;
  const upper = matchedText.toUpperCase();

  for (const alias of section.aliases) {
    if (upper.includes(alias.toUpperCase())) {
      confidence += 0.3;
      break;
    }
  }

  if (documentType === 'ficha_tecnica' && /^\d+\.\d+/.test(matchedText.trim())) {
    confidence += 0.2;
  }
  if (documentType === 'prospecto' && /^\d+\.\s*/.test(matchedText.trim())) {
    confidence += 0.15;
  }

  return Math.min(confidence, 1.0);
}

function findSectionEnd(
  text: string,
  startIndex: number,
  allPatterns: SectionPattern[],
  currentKey: string
): number {
  let earliestEnd = text.length;
  const remainingText = text.slice(startIndex + 100);

  for (const section of allPatterns) {
    if (section.key === currentKey) continue;
    for (const pattern of section.patterns) {
      const match = pattern.exec(remainingText.toUpperCase());
      if (match && match.index !== undefined) {
        const absoluteIndex = startIndex + 100 + match.index;
        if (absoluteIndex > startIndex && absoluteIndex < earliestEnd) {
          earliestEnd = absoluteIndex;
        }
      }
    }
  }

  return earliestEnd;
}

function deduplicateMatches(matches: SectionMatch[]): SectionMatch[] {
  const seen = new Set<string>();
  const result: SectionMatch[] = [];

  for (const match of matches) {
    const key = `${match.sectionKey}-${match.startPage}-${Math.round(match.startIndex / 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(match);
    }
  }

  return result.sort((a, b) => a.startIndex - b.startIndex);
}

function extractSectionText(
  normalizedText: string,
  match: SectionMatch
): string {
  return normalizedText.slice(match.startIndex, match.endIndex).trim();
}

function buildClinicalSection(
  normalizedText: string,
  match: SectionMatch
): ClinicalSection {
  const text = extractSectionText(normalizedText, match);
  return {
    titleOriginal: match.titleOriginal,
    text,
    startPage: match.startPage,
    endPage: match.endPage,
  };
}

function detectScannedPdf(extraction: PdfJsExtractionResult): boolean {
  const pagesWithoutText = extraction.pages.filter(p => p.charCount < 50).length;
  if (pagesWithoutText > extraction.pageCount * 0.5) return true;
  if (extraction.pages.some(p => p.charCount === 0)) return true;
  const avgCharsPerPage = extraction.pageCount > 0 
    ? extraction.totalChars / extraction.pageCount 
    : 0;
  if (avgCharsPerPage < 200) return true;
  return false;
}

function detectTableStructureLoss(text: string): boolean {
  const tableIndicators = [
    /\d+\s+mg\s+\d+\s+ml/i,
    /\d+\s*\/\s*\d+\s+mg/i,
    /\d+\s+x\s+\d+\s+mg/i,
    /\|\s*\d+\s*\|/,
    /\d+\s+mg\s+\d+\s+mg/i,
    /\d+\s+\.\s*\d+\s+mg/i,
  ];
  return tableIndicators.some(regex => regex.test(text));
}

function classifyQuality(
  confidence: number,
  sectionsFound: number,
  sectionsExpected: number,
  scannedDetected: boolean,
  textLength: number
): 'good' | 'partial' | 'poor' | 'unreadable' {
  if (scannedDetected) return 'unreadable';
  if (textLength < 1000) return 'unreadable';
  
  const sectionCoverage = sectionsExpected > 0 ? sectionsFound / sectionsExpected : 0;
  
  if (confidence >= 0.7 && sectionCoverage >= 0.8) return 'good';
  if (confidence >= 0.4 && sectionCoverage >= 0.5) return 'partial';
  if (confidence >= 0.1 && sectionCoverage >= 0.2) return 'poor';
  return 'unreadable';
}

export async function extractCimaClinicalSections(
  input: Buffer | Uint8Array | string,
  options?: {
    nregistro?: string;
    sourceUrl?: string;
    documentType?: CimaDocumentType;
    maxPages?: number;
  }
): Promise<CimaClinicalExtraction> {
  const isBuffer = Buffer.isBuffer(input);
  const isUint8 = input instanceof Uint8Array;
  const buffer = isBuffer || isUint8 ? input : await import('fs').then(fs => fs.readFileSync(input));
  const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pdfHash = calculatePdfHash(uint8Array);

  const extraction = await extractPdfTextFromBuffer(uint8Array, { maxPages: options?.maxPages });

  if (extraction.totalChars === 0) {
    throw new Error('PDF sin texto extraíble');
  }

  const normalizedText = fullNormalize(extraction.fullText);
  const documentType = options?.documentType || detectDocumentType(normalizedText, options?.sourceUrl);

  const matches = findSectionBoundaries(normalizedText, extraction.pageTexts, documentType);

  const sections: CimaClinicalExtraction['sections'] = {};
  for (const match of matches) {
    const clinicalSection = buildClinicalSection(normalizedText, match);
    sections[match.sectionKey] = clinicalSection;
  }

  const expectedSections = [...new Set(getSectionPatterns(documentType).map(s => s.key))];
  const foundKeys = matches.map(m => m.sectionKey);
  const foundSections = [...new Set(foundKeys)];
  const missingSections = expectedSections.filter(k => !foundKeys.includes(k));

  const warnings: string[] = [];

  if (extraction.totalChars < 1000) {
    warnings.push('PDF con texto insuficiente (posiblemente escaneado o corrupto)');
  }

  const pagesWithoutTextCalc = extraction.pages.filter(p => p.charCount < 50).length;
  if (pagesWithoutTextCalc > extraction.pageCount * 0.5) {
    warnings.push(`${pagesWithoutTextCalc} páginas sin texto significativo`);
  }

  if (extraction.pages.some(p => p.charCount === 0)) {
    warnings.push('Páginas completamente vacías detectadas');
  }

  if (missingSections.length > expectedSections.length * 0.5) {
    warnings.push(`Muchas secciones esperadas no encontradas: ${missingSections.join(', ')}`);
  }

  if (matches.some(m => m.confidence < 0.4)) {
    warnings.push('Algunas secciones detectadas con baja confianza');
  }

  const avgCharsPerPageCalc = extraction.pageCount > 0 
    ? Math.round(extraction.totalChars / extraction.pageCount) 
    : 0;
  if (avgCharsPerPageCalc < 200) {
    warnings.push(`Pocas caracteres por página (${avgCharsPerPageCalc}) - posible PDF escaneado`);
  }

  const duplicateHeaders = matches
    .map(m => m.sectionKey)
    .filter((k, i, arr) => arr.indexOf(k) !== i);
  if (duplicateHeaders.length > 0) {
    warnings.push(`Encabezados duplicados detectados: ${duplicateHeaders.join(', ')}`);
  }

  const scannedDetected = detectScannedPdf(extraction);
  if (scannedDetected) {
    warnings.push('PDF posiblemente escaneado (ocr_required)');
  }

  const tableStructureLoss = detectTableStructureLoss(extraction.fullText);
  if (tableStructureLoss) {
    warnings.push('possible_table_structure_loss');
  }

  const confidence = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
    : 0;

  const qualityClass = classifyQuality(
    confidence,
    foundSections.length,
    expectedSections.length,
    scannedDetected,
    extraction.totalChars
  );

  const qualityReport = {
    extractionMethod: 'pdfjs' as const,
    sectionsFound: foundSections,
    sectionsMissing: missingSections,
    textLength: extraction.totalChars,
    warnings,
    confidence: Math.round(confidence * 100) / 100,
    pageCount: extraction.pageCount,
    pagesWithoutText: pagesWithoutTextCalc,
    avgCharsPerPage: avgCharsPerPageCalc,
    scannedDetected,
    tableStructureLoss,
    qualityClass,
    pdfHash,
  };

  return {
    nregistro: options?.nregistro,
    documentType,
    sourceUrl: options?.sourceUrl,
    pageCount: extraction.pageCount,
    rawTextLength: extraction.totalChars,
    normalizedTextLength: normalizedText.length,
    sections,
    quality: qualityReport,
    pdfHash,
    traceability: {
      sourceUrl: options?.sourceUrl,
      nregistro: options?.nregistro,
      documentType,
      extractedAt: new Date().toISOString(),
      pdfHash,
      pageCount: extraction.pageCount,
      pdfBytes: buffer.length,
      rawTextLength: extraction.totalChars,
      normalizedTextLength: normalizedText.length,
      extractionMethod: 'pdfjs',
    },
  };
}

export async function extractCimaClinicalSectionsFromFile(
  filePath: string,
  options?: {
    nregistro?: string;
    sourceUrl?: string;
    documentType?: CimaDocumentType;
    maxPages?: number;
  }
): Promise<CimaClinicalExtraction> {
  return extractCimaClinicalSections(filePath, options);
}