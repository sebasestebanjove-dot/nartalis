export type CimaDocumentType = 'prospecto' | 'ficha_tecnica' | 'ipe' | 'english_smpc' | 'unknown';

export type QualityClass = 'good' | 'partial' | 'poor' | 'unreadable';

export interface ClinicalSection {
  titleOriginal: string;
  text: string;
  startPage?: number;
  endPage?: number;
  isSubsection?: boolean;
  parentSection?: string;
}

export interface CimaClinicalExtraction {
  nregistro?: string;
  documentType: CimaDocumentType;
  sourceUrl?: string;
  pageCount: number;
  rawTextLength: number;
  normalizedTextLength: number;
  pdfHash: string;
  sections: {
    indicaciones?: ClinicalSection;
    contraindicaciones?: ClinicalSection;
    advertencias?: ClinicalSection;
    posologia?: ClinicalSection;
    administracion?: ClinicalSection;
    efectosAdversos?: ClinicalSection;
    interacciones?: ClinicalSection;
    embarazoLactancia?: ClinicalSection;
    conduccion?: ClinicalSection;
    excipientes?: ClinicalSection;
    composicion?: ClinicalSection;
  };
  quality: {
    extractionMethod: 'pdfjs';
    sectionsFound: string[];
    sectionsMissing: string[];
    textLength: number;
    warnings: string[];
    confidence?: number;
    qualityClass: QualityClass;
    pagesWithoutText: number;
    avgCharsPerPage: number;
    scannedDetected: boolean;
    tableStructureLoss: boolean;
    pdfHash: string;
  };
  traceability: {
    sourceUrl?: string;
    nregistro?: string;
    documentType: CimaDocumentType;
    extractedAt: string;
    pdfHash: string;
    pageCount: number;
    pdfBytes: number;
    rawTextLength: number;
    normalizedTextLength: number;
    extractionMethod: 'pdfjs';
  };
}

export interface PdfExtractionResult {
  text: string;
  pageTexts: string[];
  pageCount: number;
  totalChars: number;
}

export interface PageTextItem {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface SectionMatch {
  sectionKey: CimaSectionKey;
  titleOriginal: string;
  startIndex: number;
  endIndex: number;
  startPage?: number;
  endPage?: number;
  confidence: number;
}

export type CimaSectionKey = 
  | 'indicaciones'
  | 'contraindicaciones'
  | 'advertencias'
  | 'posologia'
  | 'administracion'
  | 'efectosAdversos'
  | 'interacciones'
  | 'embarazoLactancia'
  | 'conduccion'
  | 'excipientes'
  | 'composicion';

export interface QualityReport {
  extractionMethod: 'pdfjs';
  sectionsFound: string[];
  sectionsMissing: string[];
  textLength: number;
  warnings: string[];
  confidence?: number;
  pageCount: number;
  pagesWithoutText: number;
  avgCharsPerPage: number;
  scannedDetected: boolean;
  tableStructureLoss: boolean;
  qualityClass: QualityClass;
  pdfHash: string;
}

// Public API types
export interface ClinicalPublicResponse {
  nregistro: string
  source: {
    name: 'CIMA_AEMPS'
  }
  document: {
    documentType: string
    documentHash: string
    sourceUrl: string
    extractedAt: string
  }
  clinical: {
    indicaciones: string | null
    contraindicaciones: string | null
    advertencias: string | null
    posologia: string | null
    efectosAdversos: string | null
    interacciones: string | null
    embarazoLactancia: string | null
    conduccion: string | null
    composicion: string | null
    excipientes: string | null
    administracion: string | null
  }
}

export interface ClinicalErrorResponse {
  error: string
}

export type ClinicalPublicQuality = 'good' | 'not_found'