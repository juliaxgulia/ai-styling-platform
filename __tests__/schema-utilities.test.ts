import {
  SCHEMA_METADATA,
  getAllSchemaTypes,
  getSchemaInfo,
  getAllSchemaTags,
  findSimilarTags,
  getRandomSchemaExamples,
} from '@/types/schemas';

import {
  extractValidTagsFromText,
  calculateTagConfidence,
  validateExtractedProfileData,
  ExtractedProfileData,
} from '@/lib/validation';

describe('Schema Utilities', () => {
  describe('Schema Metadata', () => {
    it('should have metadata for all schema types', () => {
      const expectedSchemas = ['EMOTIONS', 'ARCHETYPE', 'ESSENCE', 'LIFESTYLE', 'VALUES', 'SILHOUETTE', 'COLOR_PALETTE'];
      const actualSchemas = Object.keys(SCHEMA_METADATA);
      
      expectedSchemas.forEach(schema => {
        expect(actualSchemas).toContain(schema);
      });
    });

    it('should have complete metadata for each schema', () => {
      Object.values(SCHEMA_METADATA).forEach(schema => {
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('description');
        expect(schema).toHaveProperty('tags');
        expect(schema).toHaveProperty('examples');
        expect(schema.name).toBeTruthy();
        expect(schema.description).toBeTruthy();
        expect(schema.tags.length).toBeGreaterThan(0);
        expect(schema.examples.length).toBeGreaterThan(0);
      });
    });

    it('should have examples that exist in the schema tags', () => {
      Object.values(SCHEMA_METADATA).forEach(schema => {
        schema.examples.forEach(example => {
          expect(schema.tags).toContain(example);
        });
      });
    });
  });

  describe('getAllSchemaTypes', () => {
    it('should return all schema type names', () => {
      const types = getAllSchemaTypes();
      expect(types).toContain('EMOTIONS');
      expect(types).toContain('ARCHETYPE');
      expect(types).toContain('ESSENCE');
      expect(types).toContain('LIFESTYLE');
      expect(types).toContain('VALUES');
      expect(types).toContain('SILHOUETTE');
      expect(types).toContain('COLOR_PALETTE');
    });
  });

  describe('getSchemaInfo', () => {
    it('should return schema info for valid types', () => {
      const emotionsInfo = getSchemaInfo('EMOTIONS');
      expect(emotionsInfo).toBeTruthy();
      expect(emotionsInfo?.name).toBe('Emotions');
      expect(emotionsInfo?.description).toContain('feel');
    });

    it('should return null for invalid types', () => {
      const invalidInfo = getSchemaInfo('INVALID_SCHEMA');
      expect(invalidInfo).toBeNull();
    });
  });

  describe('getAllSchemaTags', () => {
    it('should return all schema tags organized by type', () => {
      const allTags = getAllSchemaTags();
      expect(allTags).toHaveProperty('emotions');
      expect(allTags).toHaveProperty('archetype');
      expect(allTags).toHaveProperty('essence');
      expect(allTags).toHaveProperty('lifestyle');
      expect(allTags).toHaveProperty('values');
      expect(allTags).toHaveProperty('silhouette');
      expect(allTags).toHaveProperty('colorPalette');
      
      expect(allTags.emotions).toContain('Confident');
      expect(allTags.archetype).toContain('The Hero');
      expect(allTags.essence).toContain('Classic');
    });
  });

  describe('findSimilarTags', () => {
    it('should find tags containing the input', () => {
      const results = findSimilarTags('confident', 'EMOTIONS');
      expect(results).toContain('Confident');
    });

    it('should find tags where input is contained in tag', () => {
      const results = findSimilarTags('hero', 'ARCHETYPE');
      expect(results).toContain('The Hero');
    });

    it('should return empty array for invalid schema', () => {
      const results = findSimilarTags('test', 'INVALID' as any);
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const results = findSimilarTags('CONFIDENT', 'EMOTIONS');
      expect(results).toContain('Confident');
    });
  });

  describe('getRandomSchemaExamples', () => {
    it('should return requested number of examples', () => {
      const examples = getRandomSchemaExamples('EMOTIONS', 3);
      expect(examples.length).toBe(3);
      examples.forEach(example => {
        expect(SCHEMA_METADATA.EMOTIONS.tags).toContain(example);
      });
    });

    it('should not exceed available tags', () => {
      const examples = getRandomSchemaExamples('LIFESTYLE', 10);
      expect(examples.length).toBeLessThanOrEqual(SCHEMA_METADATA.LIFESTYLE.tags.length);
    });

    it('should return empty array for invalid schema', () => {
      const examples = getRandomSchemaExamples('INVALID' as any, 3);
      expect(examples).toEqual([]);
    });
  });
});

describe('AI Conversation Utilities', () => {
  describe('extractValidTagsFromText', () => {
    it('should extract emotion tags from text', () => {
      const text = "I want to feel confident and powerful in my clothes";
      const tags = extractValidTagsFromText(text, 'emotions');
      expect(tags).toContain('Confident');
      expect(tags).toContain('Powerful');
    });

    it('should extract archetype tags from text', () => {
      const text = "I identify with the hero archetype and the creator mindset";
      const tags = extractValidTagsFromText(text, 'archetype');
      expect(tags).toContain('The Hero');
      expect(tags).toContain('The Creator');
    });

    it('should be case insensitive', () => {
      const text = "I love CLASSIC and dramatic styles";
      const tags = extractValidTagsFromText(text, 'essence');
      expect(tags).toContain('Classic');
      expect(tags).toContain('Dramatic');
    });

    it('should return empty array for no matches', () => {
      const text = "This text has no matching tags";
      const tags = extractValidTagsFromText(text, 'emotions');
      expect(tags).toEqual([]);
    });

    it('should handle invalid schema types', () => {
      const text = "Some text";
      const tags = extractValidTagsFromText(text, 'invalid' as any);
      expect(tags).toEqual([]);
    });
  });

  describe('calculateTagConfidence', () => {
    it('should give high confidence for exact matches', () => {
      const confidence = calculateTagConfidence("I want to feel confident", ['Confident', 'Powerful']);
      expect(confidence['Confident']).toBe(0.9);
      expect(confidence['Powerful']).toBe(0.3); // default for non-matching
    });

    it('should give medium confidence for partial word matches', () => {
      const confidence = calculateTagConfidence("I am a hero type", ['The Hero', 'The Sage']);
      expect(confidence['The Hero']).toBe(0.7); // partial word match
      expect(confidence['The Sage']).toBe(0.3); // default
    });

    it('should give lower confidence for reverse matches', () => {
      const confidence = calculateTagConfidence("power", ['Powerful', 'Confident']);
      expect(confidence['Powerful']).toBe(0.6); // reverse match
      expect(confidence['Confident']).toBe(0.3); // default
    });

    it('should handle empty input', () => {
      const confidence = calculateTagConfidence("", ['Confident']);
      expect(confidence['Confident']).toBe(0.3);
    });
  });

  describe('validateExtractedProfileData', () => {
    it('should validate complete extracted data', () => {
      const data: ExtractedProfileData = {
        emotions: ['Confident', 'Powerful'],
        archetype: ['The Hero'],
        essence: ['Classic'],
        lifestyle: ['Professional'],
        values: ['Luxury'],
        zipCode: '12345',
        maxBudget: 500,
      };

      const result = validateExtractedProfileData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.validatedData.emotions).toEqual(['Confident', 'Powerful']);
      expect(result.validatedData.archetype).toEqual(['The Hero']);
      expect(result.validatedData.zipCode).toBe('12345');
      expect(result.validatedData.maxBudget).toBe(500);
    });

    it('should filter out invalid tags and report errors', () => {
      const data: ExtractedProfileData = {
        emotions: ['Confident', 'InvalidEmotion'],
        archetype: ['The Hero', 'BadArchetype'],
        essence: ['Classic', 'Modern'],
        lifestyle: ['Professional', 'Work'],
        values: ['Luxury', 'Cheap'],
        zipCode: 'invalid',
        maxBudget: -100,
      };

      const result = validateExtractedProfileData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should keep valid tags
      expect(result.validatedData.emotions).toEqual(['Confident']);
      expect(result.validatedData.archetype).toEqual(['The Hero']);
      expect(result.validatedData.essence).toEqual(['Classic']);
      expect(result.validatedData.lifestyle).toEqual(['Professional']);
      expect(result.validatedData.values).toEqual(['Luxury']);
      
      // Should report specific errors
      expect(result.errors).toContain('Invalid emotion tags: InvalidEmotion');
      expect(result.errors).toContain('Invalid archetype tags: BadArchetype');
      expect(result.errors).toContain('Invalid essence tags: Modern');
      expect(result.errors).toContain('Invalid lifestyle tags: Work');
      expect(result.errors).toContain('Invalid value tags: Cheap');
      expect(result.errors).toContain('Invalid zip code format');
      expect(result.errors).toContain('Budget must be a positive number');
    });

    it('should handle partial data', () => {
      const data: ExtractedProfileData = {
        emotions: ['Confident'],
        zipCode: '12345',
      };

      const result = validateExtractedProfileData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.validatedData.emotions).toEqual(['Confident']);
      expect(result.validatedData.archetype).toEqual([]);
      expect(result.validatedData.zipCode).toBe('12345');
      expect(result.validatedData.maxBudget).toBeUndefined();
    });

    it('should handle empty data', () => {
      const data: ExtractedProfileData = {};

      const result = validateExtractedProfileData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.validatedData.emotions).toEqual([]);
      expect(result.validatedData.archetype).toEqual([]);
      expect(result.validatedData.essence).toEqual([]);
      expect(result.validatedData.lifestyle).toEqual([]);
      expect(result.validatedData.values).toEqual([]);
    });
  });
});