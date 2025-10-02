import { 
  validateBodyShapeAnalysis, 
  requiresAdditionalPhoto,
  getBodyShapeAnalysisPrompt,
  getBodyShapeSystemPrompt,
  CONFIDENCE_THRESHOLD
} from '@/lib/body-shape-analysis';

describe('Body Shape Analysis Utilities', () => {
  describe('validateBodyShapeAnalysis', () => {
    it('should validate correct analysis results', () => {
      const validResult = {
        bodyShape: 'waist_balance',
        confidence: 0.85,
        reasoning: 'Clear waist definition with balanced proportions'
      };

      const validation = validateBodyShapeAnalysis(validResult);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid body shape categories', () => {
      const invalidResult = {
        bodyShape: 'invalid_category',
        confidence: 0.85,
        reasoning: 'Test reasoning'
      };

      const validation = validateBodyShapeAnalysis(invalidResult);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid body shape category');
    });

    it('should reject invalid confidence scores', () => {
      const testCases = [
        { confidence: -0.1, description: 'negative confidence' },
        { confidence: 1.1, description: 'confidence > 1' },
        { confidence: 'invalid', description: 'non-numeric confidence' }
      ];

      testCases.forEach(({ confidence, description }) => {
        const invalidResult = {
          bodyShape: 'waist_balance',
          confidence,
          reasoning: 'Test reasoning'
        };

        const validation = validateBodyShapeAnalysis(invalidResult);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('Invalid confidence score');
      });
    });

    it('should reject missing or invalid reasoning', () => {
      const testCases = [
        { reasoning: undefined, description: 'missing reasoning' },
        { reasoning: '', description: 'empty reasoning' },
        { reasoning: 123, description: 'non-string reasoning' }
      ];

      testCases.forEach(({ reasoning, description }) => {
        const invalidResult = {
          bodyShape: 'waist_balance',
          confidence: 0.85,
          reasoning
        };

        const validation = validateBodyShapeAnalysis(invalidResult);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('Missing or invalid reasoning');
      });
    });

    it('should reject null or non-object inputs', () => {
      const testCases = [null, undefined, 'string', 123, []];

      testCases.forEach(invalidInput => {
        const validation = validateBodyShapeAnalysis(invalidInput);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('Invalid analysis result format');
      });
    });

    it('should validate all valid silhouette categories', () => {
      const validCategories = [
        'middle_balance',
        'lower_balance',
        'waist_balance', 
        'upper_balance',
        'equal_balance'
      ];

      validCategories.forEach(category => {
        const result = {
          bodyShape: category,
          confidence: 0.8,
          reasoning: `Analysis shows ${category} body type`
        };

        const validation = validateBodyShapeAnalysis(result);
        expect(validation.valid).toBe(true);
      });
    });
  });

  describe('requiresAdditionalPhoto', () => {
    it('should require additional photo for low confidence', () => {
      expect(requiresAdditionalPhoto(0.69)).toBe(true);
      expect(requiresAdditionalPhoto(0.5)).toBe(true);
      expect(requiresAdditionalPhoto(0.0)).toBe(true);
    });

    it('should not require additional photo for high confidence', () => {
      expect(requiresAdditionalPhoto(0.7)).toBe(false);
      expect(requiresAdditionalPhoto(0.8)).toBe(false);
      expect(requiresAdditionalPhoto(1.0)).toBe(false);
    });

    it('should use correct confidence threshold', () => {
      expect(CONFIDENCE_THRESHOLD).toBe(0.7);
      expect(requiresAdditionalPhoto(CONFIDENCE_THRESHOLD - 0.01)).toBe(true);
      expect(requiresAdditionalPhoto(CONFIDENCE_THRESHOLD)).toBe(false);
    });
  });

  describe('getBodyShapeAnalysisPrompt', () => {
    it('should return a valid prompt string', () => {
      const prompt = getBodyShapeAnalysisPrompt();
      
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain('JSON format');
      expect(prompt).toContain('bodyShape');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('reasoning');
    });

    it('should include all valid silhouette categories', () => {
      const prompt = getBodyShapeAnalysisPrompt();
      const validCategories = [
        'middle_balance',
        'lower_balance',
        'waist_balance',
        'upper_balance', 
        'equal_balance'
      ];

      validCategories.forEach(category => {
        expect(prompt).toContain(category);
      });
    });

    it('should specify confidence range', () => {
      const prompt = getBodyShapeAnalysisPrompt();
      expect(prompt).toContain('0.0 and 1.0');
    });
  });

  describe('getBodyShapeSystemPrompt', () => {
    it('should return a valid system prompt string', () => {
      const systemPrompt = getBodyShapeSystemPrompt();
      
      expect(typeof systemPrompt).toBe('string');
      expect(systemPrompt.length).toBeGreaterThan(0);
      expect(systemPrompt).toContain('professional body shape analyst');
    });

    it('should include descriptions for all silhouette categories', () => {
      const systemPrompt = getBodyShapeSystemPrompt();
      const categoryDescriptions = [
        'middle_balance',
        'lower_balance', 
        'waist_balance',
        'upper_balance',
        'equal_balance'
      ];

      categoryDescriptions.forEach(category => {
        expect(systemPrompt).toContain(category);
      });
    });

    it('should emphasize objectivity and professionalism', () => {
      const systemPrompt = getBodyShapeSystemPrompt();
      expect(systemPrompt).toContain('objective');
      expect(systemPrompt).toContain('professional');
      expect(systemPrompt).toContain('silhouette and proportions');
    });

    it('should mention confidence scoring', () => {
      const systemPrompt = getBodyShapeSystemPrompt();
      expect(systemPrompt).toContain('confidence');
    });
  });
});