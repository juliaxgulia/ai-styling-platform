import { preferenceValidationService } from '@/lib/preference-validation';

describe('PreferenceValidationService', () => {
  describe('validateZipCode', () => {
    it('should validate 5-digit zip codes', () => {
      const result = preferenceValidationService.validateZipCode('12345');
      expect(result.isValid).toBe(true);
      expect(result.zipCode).toBe('12345');
      expect(result.error).toBeUndefined();
    });

    it('should validate 5+4 zip codes and return 5-digit portion', () => {
      const result = preferenceValidationService.validateZipCode('12345-6789');
      expect(result.isValid).toBe(true);
      expect(result.zipCode).toBe('12345');
      expect(result.error).toBeUndefined();
    });

    it('should validate 9-digit zip codes and return 5-digit portion', () => {
      const result = preferenceValidationService.validateZipCode('123456789');
      expect(result.isValid).toBe(true);
      expect(result.zipCode).toBe('12345');
      expect(result.error).toBeUndefined();
    });

    it('should handle zip codes with whitespace', () => {
      const result = preferenceValidationService.validateZipCode('  12345  ');
      expect(result.isValid).toBe(true);
      expect(result.zipCode).toBe('12345');
    });

    it('should reject invalid zip code formats', () => {
      const invalidZips = ['1234', '123456', 'abcde', '12-345', ''];
      
      invalidZips.forEach(zip => {
        const result = preferenceValidationService.validateZipCode(zip);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject null or undefined input', () => {
      const result1 = preferenceValidationService.validateZipCode(null as any);
      const result2 = preferenceValidationService.validateZipCode(undefined as any);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('validateBudget', () => {
    it('should validate numeric budget values', () => {
      const result = preferenceValidationService.validateBudget(500);
      expect(result.isValid).toBe(true);
      expect(result.budget).toBe(500);
      expect(result.error).toBeUndefined();
    });

    it('should validate string budget values', () => {
      const result = preferenceValidationService.validateBudget('750');
      expect(result.isValid).toBe(true);
      expect(result.budget).toBe(750);
    });

    it('should handle currency symbols and formatting', () => {
      const testCases = [
        { input: '$500', expected: 500 },
        { input: '1,000', expected: 1000 },
        { input: '$1,500.00', expected: 1500 },
        { input: ' $750 ', expected: 750 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = preferenceValidationService.validateBudget(input);
        expect(result.isValid).toBe(true);
        expect(result.budget).toBe(expected);
      });
    });

    it('should round to nearest dollar', () => {
      const result = preferenceValidationService.validateBudget('499.99');
      expect(result.isValid).toBe(true);
      expect(result.budget).toBe(500);
    });

    it('should reject budgets below minimum', () => {
      const result = preferenceValidationService.validateBudget(5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least $10');
    });

    it('should reject budgets above maximum', () => {
      const result = preferenceValidationService.validateBudget(15000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than $10,000');
    });

    it('should reject invalid budget formats', () => {
      const invalidBudgets = ['abc', '', null, undefined, 'not a number'];
      
      invalidBudgets.forEach(budget => {
        const result = preferenceValidationService.validateBudget(budget as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('extractZipCodeFromText', () => {
    it('should extract zip codes from natural language', () => {
      const testCases = [
        { text: 'I live in 12345', expected: '12345' },
        { text: 'My zip code is 90210', expected: '90210' },
        { text: 'I\'m from New York 10001 area', expected: '10001' },
        { text: 'Located at 12345 Main Street', expected: '12345' },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = preferenceValidationService.extractZipCodeFromText(text);
        expect(result).toBe(expected);
      });
    });

    it('should return null when no valid zip code is found', () => {
      const testCases = [
        'I live in New York',
        'My area code is 123',
        'I have 123456 items',
        '',
        null,
        undefined,
      ];

      testCases.forEach(text => {
        const result = preferenceValidationService.extractZipCodeFromText(text as any);
        expect(result).toBeNull();
      });
    });

    it('should return the first valid zip code when multiple numbers exist', () => {
      const text = 'I used to live in 1234 but now I\'m in 90210 and work at 12345';
      const result = preferenceValidationService.extractZipCodeFromText(text);
      expect(result).toBe('90210'); // First valid 5-digit zip
    });
  });

  describe('extractBudgetFromText', () => {
    it('should extract budget from various currency formats', () => {
      const testCases = [
        { text: 'My budget is $500', expected: 500 },
        { text: 'I can spend around $750 per month', expected: 750 },
        { text: 'About 1000 dollars would work', expected: 1000 },
        { text: 'Up to $1,500 is fine', expected: 1500 },
        { text: 'Budget of $2,000.00', expected: 2000 },
        { text: 'I have 500 bucks to spend', expected: 500 },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = preferenceValidationService.extractBudgetFromText(text);
        expect(result).toBe(expected);
      });
    });

    it('should return null when no valid budget is found', () => {
      const testCases = [
        'I want to buy clothes',
        'My budget is very limited',
        'I can spend a lot',
        '',
        null,
        undefined,
      ];

      testCases.forEach(text => {
        const result = preferenceValidationService.extractBudgetFromText(text as any);
        expect(result).toBeNull();
      });
    });

    it('should return null for budgets outside valid range', () => {
      const testCases = [
        'My budget is $5', // Too low
        'I can spend $20,000', // Too high
      ];

      testCases.forEach(text => {
        const result = preferenceValidationService.extractBudgetFromText(text);
        expect(result).toBeNull();
      });
    });
  });

  describe('getBudgetRangeSuggestions', () => {
    it('should return all budget ranges', () => {
      const ranges = preferenceValidationService.getBudgetRangeSuggestions();
      expect(ranges).toHaveLength(8);
      expect(ranges[0].label).toBe('Under $100');
      expect(ranges[7].label).toBe('$2,000+');
    });

    it('should suggest appropriate range for given budget', () => {
      const ranges = preferenceValidationService.getBudgetRangeSuggestions(375);
      const suggestedRange = ranges.find(r => (r as any).suggested);
      expect(suggestedRange?.label).toBe('$250 - $500');
    });
  });

  describe('getClimateInfo', () => {
    it('should return climate info for valid zip codes', () => {
      const testCases = [
        { zipCode: '10001', expectedRegion: 'Northeast' },
        { zipCode: '30309', expectedRegion: 'Southeast' },
        { zipCode: '60601', expectedRegion: 'Midwest' },
        { zipCode: '90210', expectedRegion: 'West Coast' },
      ];

      testCases.forEach(({ zipCode, expectedRegion }) => {
        const result = preferenceValidationService.getClimateInfo(zipCode);
        expect(result).not.toBeNull();
        expect(result!.region).toBe(expectedRegion);
        expect(result!.climate).toBeDefined();
      });
    });

    it('should return null for invalid zip codes', () => {
      const invalidZips = ['invalid', '1234', '', null, undefined];
      
      invalidZips.forEach(zip => {
        const result = preferenceValidationService.getClimateInfo(zip as any);
        expect(result).toBeNull();
      });
    });
  });
});