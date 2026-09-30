export function normalizePdfText(rawText: string): string {
  let text = rawText;
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/([a-záéíóúñü])\-\n([a-záéíóúñü])/gi, '$1$2');
  text = text.replace(/([a-záéíóúñü])\-\n([A-ZÁÉÍÓÚÑÜ])/gi, '$1-$2');
  text = text.replace(/([a-záéíóúñü])\n([a-záéíóúñü])/gi, '$1 $2');
  text = fixSplitWords(text);
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  return text.trim();
}

function fixSplitWords(text: string): string {
  const lines = text.split('\n');
  if (lines.length <= 1) return text;
  
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
    
    if (nextLine) {
      const currentTrimmed = currentLine.trimEnd();
      const nextTrimmed = nextLine.trimStart();
      
      // Check if current line ends with a word fragment and next line starts with lowercase
      // Pattern: line ends with 3+ letters (word fragment), next line starts with lowercase letters
      const currentEndMatch = currentTrimmed.match(/([a-záéíóúñü]{3,})$/i);
      const nextStartMatch = nextTrimmed.match(/^([a-záéíóúñü]+)/i);
      
      if (currentEndMatch && nextStartMatch) {
        const endFragment = currentEndMatch[1];
        const startFragment = nextStartMatch[1];
        
        // Check if combining them forms a plausible word (at least 5 chars total)
        const combined = endFragment + startFragment;
        if (combined.length >= 5 && /^[a-záéíóúñü]+$/i.test(combined)) {
          // Check if the current line ends with punctuation (natural break)
          const hasTerminalPunct = /[.!?;:)]\s*$/.test(currentTrimmed);
          
          if (!hasTerminalPunct) {
            // Join the fragments: remove the end fragment from current line
            // and prepend it to the next line
            const newCurrentLine = currentTrimmed.slice(0, -endFragment.length).trimEnd();
            const newNextLine = endFragment + startFragment + nextTrimmed.slice(startFragment.length);
            
            result.push(newCurrentLine);
            lines[i + 1] = newNextLine;
            continue;
          }
        }
      }
    }
    
    result.push(currentLine);
  }
  
  return result.join('\n');
}

export function normalizeLine(line: string): string {
  return line
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s{2,}/g, ' ');
}

export function removeHyphenation(text: string): string {
  return text
    .replace(/([a-záéíóúñü])\-\n([a-záéíóúñü])/gi, '$1$2')
    .replace(/([a-záéíóúñü])\-\n([A-ZÁÉÍÓÚÑÜ])/gi, '$1-$2');
}

export function fixCommonPdfArtifacts(text: string): string {
  let result = text;
  result = result.replace(/\u200B/g, '');
  result = result.replace(/\u00A0/g, ' ');
  result = result.replace(/[\u2010-\u2015]/g, '-');
  result = result.replace(/[\u2018\u2019]/g, "'");
  result = result.replace(/[\u201C\u201D]/g, '"');
  result = result.replace(/\u2026/g, '...');
  result = result.replace(/[\u2022\u2023\u25E6\u2043]/g, '•');
  result = result.replace(/\s*\n\s*/g, '\n');
  return result;
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fullNormalize(rawText: string): string {
  let text = fixCommonPdfArtifacts(rawText);
  text = removeHyphenation(text);
  text = normalizePdfText(text);
  text = normalizeWhitespace(text);
  return text;
}

export function extractPagesFromText(text: string): string[] {
  const pages = text.split(/\f|\n\s*\n\s*\n/);
  return pages
    .map(p => normalizeWhitespace(p))
    .filter(p => p.length > 0);
}

export function getPageForIndex(text: string, index: number, pageBreaks: number[]): number {
  for (let i = 0; i < pageBreaks.length; i++) {
    if (index < pageBreaks[i]) return i + 1;
  }
  return pageBreaks.length || 1;
}

export function buildPageBreakMap(pageTexts: string[]): number[] {
  const breaks: number[] = [];
  let cumulative = 0;
  for (const pageText of pageTexts) {
    cumulative += pageText.length + 1;
    breaks.push(cumulative);
  }
  return breaks;
}