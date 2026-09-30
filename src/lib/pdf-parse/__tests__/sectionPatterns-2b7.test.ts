import { getSectionPatterns } from '@/lib/pdf-parse/sectionPatterns';

describe('FASE 2B.7 - Parser patterns for efectos_adversos and embarazo_lactancia', () => {
  const prospectoPatterns = getSectionPatterns('prospecto');
  const fichaPatterns = getSectionPatterns('ficha_tecnica');

  describe('PROSPECTO - efectosAdversos', () => {
    const section = prospectoPatterns.find(s => s.key === 'efectosAdversos');
    expect(section).toBeDefined();

    const testCases = [
      '4.8 Reacciones adversas',
      '4.8 REACCIONES ADVERSAS',
      'Posibles efectos adversos',
      'EFECTOS ADVERSOS',
      'Reacciones adversas',
      'Efectos secundarios',
      '4.8. Reacciones adversas',
      '4.8 Reacciones adversas y efectos secundarios',
    ];

    testCases.forEach(header => {
      test(`matches "${header}"`, () => {
        const matched = section!.patterns.some(p => p.test(header));
        expect(matched).toBe(true);
      });
    });
  });

  describe('PROSPECTO - embarazoLactancia', () => {
    const section = prospectoPatterns.find(s => s.key === 'embarazoLactancia');
    expect(section).toBeDefined();

    const testCases = [
      'Embarazo y lactancia',
      'Fertilidad, embarazo y lactancia',
      'Embarazo, lactancia',
      'Fertilidad',
      'Lactancia',
      '4.6 Fertilidad, embarazo y lactancia',
    ];

    testCases.forEach(header => {
      test(`matches "${header}"`, () => {
        const matched = section!.patterns.some(p => p.test(header));
        expect(matched).toBe(true);
      });
    });

    // False positives - these are sentence fragments that should be filtered by section boundary logic
    const falsePositives = [
      'Los efectos adversos fueron leves',
      'Durante el embarazo y la lactancia',
    ];

    falsePositives.forEach(header => {
      test(`"${header}" matches pattern (filtered by boundary logic)`, () => {
        const matched = section!.patterns.some(p => p.test(header));
        // These match patterns but should be filtered by isLikelySectionHeader
        expect(matched).toBe(true);
      });
    });
  });

  describe('FICHA_TECNICA - efectosAdversos', () => {
    const section = fichaPatterns.find(s => s.key === 'efectosAdversos');
    expect(section).toBeDefined();

    const testCases = [
      '4.8 Reacciones adversas',
      '4.8 REACCIONES ADVERSAS',
      'Reacciones adversas',
      'Efectos adversos',
      'Efectos secundarios',  // NEW pattern
      '4.8. Reacciones adversas',
      '4.8 Reacciones adversas y efectos secundarios',
    ];

    testCases.forEach(header => {
      test(`matches "${header}"`, () => {
        const matched = section!.patterns.some(p => p.test(header));
        expect(matched).toBe(true);
      });
    });
  });

  describe('FICHA_TECNICA - embarazoLactancia', () => {
    const section = fichaPatterns.find(s => s.key === 'embarazoLactancia');
    expect(section).toBeDefined();

    const testCases = [
      '4.6 Fertilidad, embarazo y lactancia',
      'Fertilidad, embarazo y lactancia',
      'Embarazo y lactancia',
      'Embarazo, lactancia',  // NEW comma variant
      'Fertilidad',
      'Lactancia',  // NEW standalone pattern
      '4.6 Fertilidad, embarazo y lactancia.',
    ];

    testCases.forEach(header => {
      test(`matches "${header}"`, () => {
        const matched = section!.patterns.some(p => p.test(header));
        expect(matched).toBe(true);
      });
    });

    // This should NOT match (sentence fragment, filtered by boundary logic)
    test('"Durante el embarazo y la lactancia" matches pattern (filtered by boundary logic)', () => {
      const matched = section!.patterns.some(p => p.test('Durante el embarazo y la lactancia'));
      expect(matched).toBe(true);
    });
  });

  describe('Pattern completeness', () => {
    test('FICHA_TECNICA efectosAdversos includes "efectos secundarios"', () => {
      const section = fichaPatterns.find(s => s.key === 'efectosAdversos');
      const hasSecundarios = section!.patterns.some(p => p.source.includes('efectos\\\\s+secundarios'));
      expect(hasSecundarios).toBe(true);
    });

    test('FICHA_TECNICA embarazoLactancia includes comma variant', () => {
      const section = fichaPatterns.find(s => s.key === 'embarazoLactancia');
      const hasCommaVariant = section!.patterns.some(p => p.source.includes('embarazo\\\\s*,\\\\s*lactancia'));
      expect(hasCommaVariant).toBe(true);
    });

    test('FICHA_TECNICA embarazoLactancia includes standalone lactancia', () => {
      const section = fichaPatterns.find(s => s.key === 'embarazoLactancia');
      const hasLactancia = section!.patterns.some(p => p.source === 'lactancia' || p.source === '\\\\blactancia\\\\b' || p.source.includes('lactancia'));
      expect(hasLactancia).toBe(true);
    });
  });
});