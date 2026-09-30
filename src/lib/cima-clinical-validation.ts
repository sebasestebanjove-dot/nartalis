import type { CimaClinicalExtraction, CimaSectionKey } from '@/lib/pdf-parse/types';

export interface ValidationResult {
  accepted: boolean;
  qualityClass: 'good' | 'partial' | 'poor' | 'unreadable';
  reasons: string[];
  warnings: string[];
  score: number;
}

const REQUIRED_SECTIONS = [
  'indicaciones',
  'contraindicaciones',
  'advertencias',
  'posologia',
  'administracion',
  'efectosAdversos',
  'interacciones',
  'embarazoLactancia',
  'conduccion',
  'excipientes',
  'composicion'
] as const;

export function validateClinicalExtraction(extraction: CimaClinicalExtraction): ValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (!extraction) {
    return {
      accepted: false,
      qualityClass: 'unreadable',
      reasons: ['No extraction result provided'],
      warnings: [],
      score: 0
    };
  }

  if (extraction.rawTextLength < 1000) {
    score -= 30;
  }

  let qualityClass: 'good' | 'partial' | 'poor' | 'unreadable' = extraction.quality?.qualityClass || 'unreadable';
  
  if (extraction.quality?.scannedDetected) {
    score -= 40;
  }

  if (extraction.quality?.tableStructureLoss) {
    score -= 20;
  }

  if (extraction.quality?.warnings && extraction.quality.warnings.length > 0) {
    score -= extraction.quality.warnings.length * 5;
  }

  const foundSections = extraction.quality?.sectionsFound || [];
  const _missingSectionsFromQuality = extraction.quality?.sectionsMissing || [];
  
  const sectionCoverage = extraction.quality?.sectionsFound.length > 0 
    ? extraction.quality.sectionsFound.length / 11 
    : 0;

  const missingRequiredSections = [
    'indicaciones',
    'contraindicaciones',
    'advertencias',
    'posologia',
    'administracion',
    'efectosAdversos',
    'interacciones',
    'embarazoLactancia',
    'conduccion',
    'excipientes',
    'composicion'
  ].filter(s => !foundSections.includes(s));
  
  if (missingRequiredSections.length > 0) {
    score -= missingRequiredSections.length * 10;
  }

  let scoreCalc = 100;
  scoreCalc -= (1 - (extraction.quality?.sectionsFound.length || 0) / 11) * 50;
  
  const confidence = extraction.quality?.confidence || 0;
  if (confidence < 0.7) {
    scoreCalc -= (0.7 - confidence) * 100;
  }

  if (confidence < 0.1) scoreCalc = 0;
  else if (confidence < 0.4) scoreCalc = Math.min(scoreCalc, 40);
  else if (confidence < 0.7) scoreCalc = Math.min(scoreCalc, 70);

  
  
  if (extraction.rawTextLength < 1000) {
    qualityClass = 'unreadable';
  } else if (confidence >= 0.7 && (extraction.quality?.sectionsFound?.length || 0) >= 9) {
    qualityClass = 'good';
  } else if (confidence >= 0.4 && (extraction.quality?.sectionsFound?.length || 0) >= 6) {
    qualityClass = 'partial';
  } else if (confidence >= 0.1 && (extraction.quality?.sectionsFound?.length || 0) >= 3) {
    qualityClass = 'poor';
  } else {
    qualityClass = 'unreadable';
  }

  const accepted = qualityClass === 'good' || qualityClass === 'partial';

  return {
    accepted,
    qualityClass,
    reasons: [],
    warnings: [],
    score: Math.max(0, Math.min(100, Math.round(scoreCalc)))
  };
}

export function isPublicable(extraction: CimaClinicalExtraction): boolean {
  const result = validateClinicalExtraction(extraction);
  return result.qualityClass === 'good';
}

export function getPublicableFields(extraction: CimaClinicalExtraction): CimaSectionKey[] {
  const validation = validateClinicalExtraction(extraction);
  if (!validation.accepted) return [];
  
  const requiredSections: CimaSectionKey[] = ['indicaciones', 'contraindicaciones', 'advertencias', 'posologia',
    'administracion', 'efectosAdversos', 'interacciones', 'embarazoLactancia',
    'conduccion', 'excipientes', 'composicion'];
  
  return requiredSections.filter(section => 
    (extraction.sections[section]?.text?.length ?? 0) > 0
  );
}