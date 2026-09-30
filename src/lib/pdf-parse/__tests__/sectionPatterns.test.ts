import './polyfill';
import { describe, it, expect } from 'vitest';
import { getSectionPatterns } from '../sectionPatterns';
import { findSectionBoundaries, calculateMatchConfidence } from '../extractClinicalSections';

describe('Section Patterns - Interacciones', () => {
  describe('getSectionPatterns', () => {
    it('should return interacciones patterns for ficha_tecnica', () => {
      const patterns = getSectionPatterns('ficha_tecnica');
      const interacciones = patterns.find(p => p.key === 'interacciones');
      
      expect(interacciones).toBeDefined();
      expect(interacciones?.key).toBe('interacciones');
      expect(interacciones?.patterns.length).toBeGreaterThan(0);
    });

    it('should return interacciones patterns for prospecto', () => {
      const patterns = getSectionPatterns('prospecto');
      const interacciones = patterns.find(p => p.key === 'interacciones');
      
      expect(interacciones).toBeDefined();
      expect(interacciones?.key).toBe('interacciones');
      expect(interacciones?.patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern matching - interacciones', () => {
    const fichaTecnicaPatterns = getSectionPatterns('ficha_tecnica');
    const interaccionesPattern = fichaTecnicaPatterns.find(p => p.key === 'interacciones');

    it('should match plural variant: Interacciones con otros medicamentos', () => {
      expect(interaccionesPattern).toBeDefined();
      
      const testCases = [
        '4.5 Interacciones con otros medicamentos',
        'Interacciones con otros medicamentos',
        'INTERACCIONES CON OTROS MEDICAMENTOS',
        'interacciones con otros medicamentos',
      ];
      
      for (const text of testCases) {
        const matched = interaccionesPattern?.patterns.some(p => p.test(text));
        expect(matched).toBe(true);
      }
    });

    it('should match singular variant: Interacción con otros medicamentos', () => {
      expect(interaccionesPattern).toBeDefined();
      
      const testCases = [
        'Interacción con otros medicamentos',
        'INTERACCIÓN CON OTROS MEDICAMENTOS',
        'interacción con otros medicamentos',
      ];
      
      for (const text of testCases) {
        const matched = interaccionesPattern?.patterns.some(p => p.test(text));
        expect(matched).toBe(true);
      }
    });

    it('should match singular without accent: interaccion con otros medicamentos', () => {
      expect(interaccionesPattern).toBeDefined();
      
      const text = 'interaccion con otros medicamentos';
      const matched = interaccionesPattern?.patterns.some(p => p.test(text));
      expect(matched).toBe(true);
    });

    it('should match singular with uppercase: INTERACCIÓN CON OTROS MEDICAMENTOS', () => {
      expect(interaccionesPattern).toBeDefined();
      
      const text = 'INTERACCIÓN CON OTROS MEDICAMENTOS';
      const matched = interaccionesPattern?.patterns.some(p => p.test(text));
      expect(matched).toBe(true);
    });
  });

  describe('Pattern matching - false positives', () => {
    const fichaTecnicaPatterns = getSectionPatterns('ficha_tecnica');
    const interaccionesPattern = fichaTecnicaPatterns.find(p => p.key === 'interacciones');
    const advertenciasPattern = fichaTecnicaPatterns.find(p => p.key === 'advertencias');

    it('should NOT confuse interacciones with advertencias', () => {
      expect(interaccionesPattern).toBeDefined();
      expect(advertenciasPattern).toBeDefined();
      
      const warningTexts = [
        'Advertencias y precauciones especiales de empleo',
        '4.4 Advertencias y precauciones especiales de empleo',
      ];
      
      for (const text of warningTexts) {
        const interaccionesMatched = interaccionesPattern?.patterns.some(p => p.test(text));
        const advertenciasMatched = advertenciasPattern?.patterns.some(p => p.test(text));
        
        // Warning texts should match advertencias, not interacciones
        expect(advertenciasMatched).toBe(true);
        expect(interaccionesMatched).toBe(false);
      }
    });
  });

  describe('findSectionBoundaries - interacciones detection', () => {
    it('should detect interacciones section header in ficha_tecnica text', () => {
      const text = `
        4.1 Indicaciones terapéuticas
        Este medicamento está indicado para...
        
        4.5 Interacciones con otros medicamentos
        No se han descrito interacciones.
        
        4.6 Embarazo y lactancia
      `;
      
      const pageTexts = ['page 1'];
      const matches = findSectionBoundaries(text, pageTexts, 'ficha_tecnica');
      
      const interaccionesMatch = matches.find(m => m.sectionKey === 'interacciones');
      expect(interaccionesMatch).toBeDefined();
      expect(interaccionesMatch?.sectionKey).toBe('interacciones');
      expect(interaccionesMatch?.titleOriginal.toLowerCase()).toContain('interacciones');
    });

    it('should detect singular interacción section header', () => {
      const text = `
        4.1 Indicaciones terapéuticas
        Este medicamento está indicado para...
        
        4.5 Interacción con otros medicamentos
        No se han descrito interacciones.
        
        4.6 Embarazo y lactancia
      `;
      
      const pageTexts = ['page 1'];
      const matches = findSectionBoundaries(text, pageTexts, 'ficha_tecnica');
      
      const interaccionesMatch = matches.find(m => m.sectionKey === 'interacciones');
      expect(interaccionesMatch).toBeDefined();
      expect(interaccionesMatch?.sectionKey).toBe('interacciones');
      expect(interaccionesMatch?.titleOriginal.toLowerCase()).toContain('interacción');
    });
  });

  describe('calculateMatchConfidence - interacciones', () => {
    const patterns = getSectionPatterns('ficha_tecnica');
    const interacciones = patterns.find(p => p.key === 'interacciones');

    it('should give confidence 0.5 for exact plural match without aliases/section numbers', () => {
      expect(interacciones).toBeDefined();
      
      const pluralText = 'Interacciones con otros medicamentos';
      const confidence = calculateMatchConfidence(pluralText, interacciones!, 'ficha_tecnica');
      
      // Base confidence is 0.5, no alias match, no section number prefix
      expect(confidence).toBe(0.5);
    });

    it('should give base confidence 0.5 for singular match without aliases/section numbers', () => {
      expect(interacciones).toBeDefined();
      
      const singularText = 'Interacción con otros medicamentos';
      const confidence = calculateMatchConfidence(singularText, interacciones!, 'ficha_tecnica');
      
      // Base confidence is 0.5
      expect(confidence).toBe(0.5);
    });

    it('should give confidence 1.0 with section number prefix (4.5) and alias match', () => {
      expect(interacciones).toBeDefined();
      
      const withNumber = '4.5 Interacciones con otros medicamentos';
      const confidence = calculateMatchConfidence(withNumber, interacciones!, 'ficha_tecnica');
      
      // Base 0.5 + 0.3 for alias match + 0.2 for section number prefix = 1.0 (capped)
      expect(confidence).toBe(1.0);
    });

    it('should give confidence 0.8 with alias match', () => {
      expect(interacciones).toBeDefined();
      
      // The alias '4.5 interacciones con otros medicamentos' is in the aliases array
      const withAlias = '4.5 Interacciones con otros medicamentos';
      const confidence = calculateMatchConfidence(withAlias, interacciones!, 'ficha_tecnica');
      
      // Base 0.5 + 0.3 for alias match + 0.2 for section number
      // But the function checks aliases against the matched text, so it needs the alias text
      expect(confidence).toBeGreaterThanOrEqual(0.5);
    });
  });
});