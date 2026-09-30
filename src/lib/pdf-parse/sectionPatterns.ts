import type { CimaSectionKey, CimaDocumentType } from './types';

export interface SectionPattern {
  key: CimaSectionKey;
  patterns: RegExp[];
  aliases: string[];
  requiredContext?: string[];
}

export const PROSPECTO_SECTIONS: SectionPattern[] = [
  {
    key: 'indicaciones',
    patterns: [
      /^(?:1[\.\s]*)?\s*qu[eé]\s+es\s+.+?\s+y\s+para\s+qu[eé]\s+se\s+utiliza/i,
      /^(?:1[\.\s]*)?\s*para\s+qu[eé]\s+se\s+utiliza/i,
      /qu[eé]\s+es\s+[^.]+?\s+y\s+para\s+qu[eé]\s+se\s+utiliza/i,
      /indicaciones?\s+terap[eé]uticas/i,
      /^indicaciones?\s*$/i,
    ],
    aliases: ['qué es', 'para qué se utiliza', 'indicaciones terapéuticas'],
  },
  {
    key: 'contraindicaciones',
    patterns: [
      /^(?:2[\.\s]*)?\s*qu[eé]\s+necesita\s+saber\s+antes\s+de\s+tomar/i,
      /^(?:2[\.\s]*)?\s*antes\s+de\s+tomar/i,
      /contraindicaciones/i,
      /no\s+utilice/i,
    ],
    aliases: ['qué necesita saber', 'antes de tomar'],
  },
  {
    key: 'advertencias',
    patterns: [
      /advertencias?\s+y\s+precauciones/i,
      /precauciones\s+de\s+empleo/i,
      /advertencias?\s+especiales/i,
      /tenga\s+especial\s+cuidado/i,
      /precauciones/i,
    ],
    aliases: ['advertencias y precauciones', 'precauciones de empleo'],
  },
  {
    key: 'posologia',
    patterns: [
      /^(?:3[\.\s]*)?\s*c[oó]mo\s+tomar/i,
      /^(?:3[\.\s]*)?\s*c[oó]mo\s+administrar/i,
      /posolog[ií]a/i,
      /dosis/i,
      /c[oó]mo\s+se\s+debe\s+tomar/i,
    ],
    aliases: ['cómo tomar', 'cómo administrar', 'posología'],
  },
  {
    key: 'administracion',
    patterns: [
      /forma\s+de\s+administraci[oó]n/i,
      /modo\s+de\s+administraci[oó]n/i,
      /v[ií]a\s+de\s+administraci[oó]n/i,
      /c[oó]mo\s+se\s+administra/i,
    ],
    aliases: ['forma de administración', 'vía de administración'],
  },
  {
    key: 'efectosAdversos',
    patterns: [
      /^(?:4[\.\s]*)?\s*posibles\s+efectos\s+adversos/i,
      /efectos\s+adversos/i,
      /reacciones\s+adversas/i,
      /efectos\s+secundarios/i,
    ],
    aliases: ['posibles efectos adversos', 'reacciones adversas'],
  },
  {
    key: 'interacciones',
    patterns: [
      /interacciones?\s+con\s+otros\s+medicamentos/i,
      /interacciones?\s+medicamentosas/i,
      /toma\s+de\s+otros\s+medicamentos/i,
      /interacci[oó]n/i,
    ],
    aliases: ['interacciones medicamentosas', 'toma de otros medicamentos'],
  },
  {
    key: 'embarazoLactancia',
    patterns: [
      /embarazo\s+y\s+lactancia/i,
      /embarazo\s*,\s*lactancia/i,
      /embarazo/i,
      /lactancia/i,
      /fertilidad/i,
    ],
    aliases: ['embarazo y lactancia', 'fertilidad'],
  },
  {
    key: 'conduccion',
    patterns: [
      /conducci[oó]n\s+y\s+uso\s+de\s+m[aá]quinas/i,
      /capacidad\s+para\s+conducir/i,
      /conducci[oó]n/i,
      /uso\s+de\s+m[aá]quinas/i,
    ],
    aliases: ['conducción y uso de máquinas'],
  },
  {
    key: 'excipientes',
    patterns: [
      /^(?:6[\.\s]*)?\s*contenido\s+del\s+envase\s+e\s+informaci[oó]n\s+adicional/i,
      /excipientes/i,
      /lista\s+de\s+excipientes/i,
      /composici[oó]n\s+cualitativa\s+y\s+cuantitativa/i,
    ],
    aliases: ['contenido del envase', 'lista de excipientes'],
  },
  {
    key: 'composicion',
    patterns: [
      /composici[oó]n\s+cualitativa\s+y\s+cuantitativa/i,
      /composici[oó]n\s+del\s+medicamento/i,
      /qu[eé]\s+contiene/i,
      /composici[oó]n/i,
    ],
    aliases: ['composición cualitativa y cuantitativa'],
  },
];

export const FICHA_TECNICA_SECTIONS: SectionPattern[] = [
  {
    key: 'indicaciones',
    patterns: [
      /4\.1\s*indicaciones?\s+terap[eé]uticas/i,
      /indicaciones?\s+terap[eé]uticas/i,
      /^4\.1\s*$/i,
      // Therapeutic indications without section number (handle split words)
      /therapeutic\s+indica\s*tions/i,
      /therapeutic\s+indicati\s*ons/i,
      /therapeutic\s+indicat\s*ions/i,
      /therapeutic\s+indication/i,
      /indications\s+therapeutic/i,
      /indicac\s*iones?\s+terap[eé]uticas/i,
      /indicati\s*ons\s+terap[eé]uticas/i,
      /indicat\s*ions\s+terap[eé]uticas/i,
    ],
    aliases: ['4.1 indicaciones terapéuticas'],
  },
  {
    key: 'posologia',
    patterns: [
      /4\.2\s*posolog[ií]a\s+y\s+forma\s+de\s+administraci[oó]n/i,
      /posolog[ií]a\s+y\s+forma\s+de\s+administraci[oó]n/i,
      /posolog[ií]a/i,
      /^4\.2\s*$/i,
    ],
    aliases: ['4.2 posología y forma de administración'],
  },
  {
    key: 'administracion',
    patterns: [
      /4\.2\s*posolog[ií]a\s+y\s+forma\s+de\s+administraci[oó]n/i,
      /forma\s+de\s+administraci[oó]n/i,
      /v[ií]a\s+de\s+administraci[oó]n/i,
      /modo\s+de\s+administraci[oó]n/i,
    ],
    aliases: ['forma de administración (en 4.2)'],
  },
  {
    key: 'contraindicaciones',
    patterns: [
      /4\.3\s*contraindicaciones/i,
      /contraindicaciones/i,
      /^4\.3\s*$/i,
    ],
    aliases: ['4.3 contraindicaciones'],
  },
  {
    key: 'advertencias',
    patterns: [
      /4\.4\s*advertencias\s+y\s+precauciones\s+especiales\s+de\s+empleo/i,
      /advertencias\s+y\s+precauciones\s+especiales\s+de\s+empleo/i,
      /advertencias\s+y\s+precauciones/i,
      /precauciones\s+especiales\s+de\s+empleo/i,
      /^4\.4\s*$/i,
    ],
    aliases: ['4.4 advertencias y precauciones especiales'],
  },
  {
    key: 'interacciones',
    patterns: [
      /4\.5\s*interacciones\s+con\s+otros\s+medicamentos/i,
      /interacciones\s+con\s+otros\s+medicamentos/i,
      // Variante singular detectada en experimento 2B.3.5 (ej. 86274)
      /interacci[oó]n\s+con\s+otros\s+medicamentos/i,
      /interacciones?\s+medicamentosas/i,
      /^4\.5\s*$/i,
      // Subsecciones y referencias inline
      /interacciones\s+con\s+pruebas\s+anal[ií]ticas/i,
      /interacciones\s+con\s+otros\s+medicamentos\s+y\s+otras\s+formas\s+de\s+interacci[oó]n/i,
      /ver\s+secci[oó]n\s+4\.5/i,
      /ver\s+apartado\s+4\.5/i,
      /secci[oó]n\s+4\.5/i,
      /apartado\s+4\.5/i,
    ],
    aliases: ['4.5 interacciones con otros medicamentos'],
  },
  {
    key: 'embarazoLactancia',
    patterns: [
      /4\.6\s*fertilidad,\s*embarazo\s+y\s+lactancia/i,
      /fertilidad,\s*embarazo\s+y\s+lactancia/i,
      /embarazo\s+y\s+lactancia/i,
      /embarazo\s*,\s*lactancia/i,
      /fertilidad/i,
      /lactancia/i,
      /^4\.6\s*$/i,
    ],
    aliases: ['4.6 fertilidad, embarazo y lactancia'],
  },
  {
    key: 'conduccion',
    patterns: [
      /4\.7\s*efectos\s+sobre\s+la\s+capacidad\s+para\s+conducir\s+y\s+utilizar\s+m[aá]quinas/i,
      /efectos\s+sobre\s+la\s+capacidad\s+para\s+conducir/i,
      /conducci[oó]n\s+y\s+uso\s+de\s+m[aá]quinas/i,
      /^4\.7\s*$/i,
    ],
    aliases: ['4.7 efectos sobre la capacidad para conducir'],
  },
  {
    key: 'efectosAdversos',
    patterns: [
      /4\.8\s*reacciones\s+adversas/i,
      /reacciones\s+adversas/i,
      /efectos\s+adversos/i,
      /efectos\s+secundarios/i,
      /^4\.8\s*$/i,
    ],
    aliases: ['4.8 reacciones adversas'],
  },
  {
    key: 'excipientes',
    patterns: [
      /6\.1\s*lista\s+de\s+excipientes/i,
      /lista\s+de\s+excipientes/i,
      /excipientes/i,
      /^6\.1\s*$/i,
    ],
    aliases: ['6.1 lista de excipientes'],
  },
  {
    key: 'composicion',
    patterns: [
      /composici[oó]n\s+cualitativa\s+y\s+cuantitativa/i,
      /^2\s*composici[oó]n/i,
      /composici[oó]n\s+del\s+medicamento/i,
      /composici[oó]n\s+cualitativa\s+y\s+cuantitativa/i,
    ],
    aliases: ['2 composición cualitativa y cuantitativa'],
  },
];

export const ENGLISH_SMPC_SECTIONS: SectionPattern[] = [
  {
    key: 'indicaciones',
    patterns: [
      /4\.1\s*therapeutic\s*indications/i,
      /therapeutic\s+indica\s*tions/i,
      /therapeutic\s+indicati\s*ons/i,
      /therapeutic\s+indicat\s*ions/i,
      /therapeutic\s+indication/i,
      /indications\s+therapeutic/i,
      /^4\.1\s*$/i,
    ],
    aliases: ['4.1 Therapeutic indications'],
  },
  {
    key: 'posologia',
    patterns: [
      /4\.2\s*posology\s+and\s+method\s+of\s+administration/i,
      /posology\s+and\s+method\s+of\s+administration/i,
      /^4\.2\s*$/i,
    ],
    aliases: ['4.2 Posology and method of administration'],
  },
  {
    key: 'administracion',
    patterns: [
      /method\s+of\s+administration/i,
      /route\s+of\s+administration/i,
      /^4\.2\s*$/i,
    ],
    aliases: ['Method of administration'],
  },
  {
    key: 'contraindicaciones',
    patterns: [
      /4\.3\s*contraindications/i,
      /contraindications/i,
      /^4\.3\s*$/i,
    ],
    aliases: ['4.3 Contraindications'],
  },
  {
    key: 'advertencias',
    patterns: [
      /4\.4\s*special\s+warnings\s+and\s+precautions\s+for\s+use/i,
      /special\s+warnings\s+and\s+precautions\s+for\s+use/i,
      /special\s+warnings\s+and\s+precautions/i,
      /^4\.4\s*$/i,
    ],
    aliases: ['4.4 Special warnings and precautions for use'],
  },
  {
    key: 'interacciones',
    patterns: [
      /4\.5\s*interaction\s+with\s+other\s+medicinal\s+products/i,
      /interaction\s+with\s+other\s+medicinal\s+products/i,
      /interactions/i,
      /^4\.5\s*$/i,
      // Subsections and inline references
      /interaction\s+with\s+diagnostic\s+tests/i,
      /interaction\s+with\s+laboratory\s+tests/i,
      /interaction\s+with\s+other\s+medicinal\s+products\s+and\s+other\s+forms\s+of\s+interaction/i,
      /see\s+section\s+4\.5/i,
      /see\s+section\s+4\.5/i,
      /section\s+4\.5/i,
    ],
    aliases: ['4.5 Interaction with other medicinal products'],
  },
  {
    key: 'embarazoLactancia',
    patterns: [
      /4\.6\s*fertility,\s*pregnancy\s+and\s+lactation/i,
      /fertility,\s*pregnancy\s+and\s+lactation/i,
      /pregnancy\s+and\s+lactation/i,
      /fertility/i,
      /^4\.6\s*$/i,
    ],
    aliases: ['4.6 Fertility, pregnancy and lactation'],
  },
  {
    key: 'conduccion',
    patterns: [
      /4\.7\s*effects\s+on\s+ability\s+to\s+drive\s+and\s+use\s+machines/i,
      /effects\s+on\s+ability\s+to\s+drive/i,
      /drive\s+and\s+use\s+machines/i,
      /^4\.7\s*$/i,
    ],
    aliases: ['4.7 Effects on ability to drive and use machines'],
  },
  {
    key: 'efectosAdversos',
    patterns: [
      /4\.8\s*undesirable\s+effects/i,
      /undesirable\s+effects/i,
      /adverse\s+reactions/i,
      /^4\.8\s*$/i,
    ],
    aliases: ['4.8 Undesirable effects'],
  },
  {
    key: 'excipientes',
    patterns: [
      /6\.1\s*list\s+of\s+excipients/i,
      /list\s+of\s+excipients/i,
      /excipients/i,
      /^6\.1\s*$/i,
    ],
    aliases: ['6.1 List of excipients'],
  },
  {
    key: 'composicion',
    patterns: [
      /qualitative\s+and\s+quantitative\s+composition/i,
      /^2\s*qualitative\s+and\s+quantitative\s+composition/i,
      /^2\s*composition/i,
    ],
    aliases: ['2 Qualitative and quantitative composition'],
  },
];

export function getSectionPatterns(documentType: CimaDocumentType): SectionPattern[] {
  switch (documentType) {
    case 'prospecto':
      return PROSPECTO_SECTIONS;
    case 'ficha_tecnica':
      return [...FICHA_TECNICA_SECTIONS, ...ENGLISH_SMPC_SECTIONS];
    case 'ipe':
      return PROSPECTO_SECTIONS;
    case 'english_smpc':
      return ENGLISH_SMPC_SECTIONS;
    default:
      return [...PROSPECTO_SECTIONS, ...FICHA_TECNICA_SECTIONS, ...ENGLISH_SMPC_SECTIONS];
  }
}

export function detectDocumentType(text: string, sourceUrl?: string): CimaDocumentType {
  if (sourceUrl) {
    if (sourceUrl.includes('/p/') || sourceUrl.includes('/P_')) return 'prospecto';
    if (sourceUrl.includes('/ft/') || sourceUrl.includes('/FT_')) return 'ficha_tecnica';
    if (sourceUrl.includes('/ipe/') || sourceUrl.includes('/IPE_')) return 'ipe';
  }
  const lower = text.toLowerCase();
  if (lower.includes('annex i summary of product characteristics') ||
      lower.includes('summary of product characteristics') ||
      lower.includes('therapeutic indications') ||
      lower.includes('posology and method of administration')) {
    return 'ficha_tecnica';
  }
  if (lower.includes('ficha técnica') || lower.includes('ficha tecnica') || 
      lower.includes('4.1 indicaciones terapéuticas') || 
      lower.includes('4.2 posología y forma de administración')) {
    return 'ficha_tecnica';
  }
  if (lower.includes('prospecto') || 
      (lower.includes('qué es') && lower.includes('para qué se utiliza'))) {
    return 'prospecto';
  }
  return 'unknown';
}

export function normalizeTitle(title: string): string {
  return title
    .replace(/^\d+[\.\s]*/, '')
    .replace(/^[\s\-\:]+/, '')
    .trim()
    .toLowerCase();
}

export function isLikelySectionHeader(line: string, documentType: CimaDocumentType): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (/^page\s+\d+/i.test(trimmed)) return false;
  if (/^\s*\d+\s*$/.test(trimmed)) return false;
  const patterns = getSectionPatterns(documentType);
  for (const section of patterns) {
    for (const pattern of section.patterns) {
      if (pattern.test(trimmed)) return true;
    }
  }
  return false;
}