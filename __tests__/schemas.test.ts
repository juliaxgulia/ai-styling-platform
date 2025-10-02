import {
  EMOTIONS_SCHEMA,
  ARCHETYPE_SCHEMA,
  ESSENCE_SCHEMA,
  LIFESTYLE_SCHEMA,
  VALUES_SCHEMA,
  SILHOUETTE_SCHEMA,
  COLOR_PALETTE_SCHEMA,
  EmotionTag,
  ArchetypeTag,
  EssenceTag,
  LifestyleTag,
  ValueTag,
  SilhouetteTag,
  ColorPaletteTag,
} from '@/types/schemas';

import {
  isValidEmotionTag,
  isValidArchetypeTag,
  isValidEssenceTag,
  isValidLifestyleTag,
  isValidValueTag,
  isValidSilhouetteTag,
  isValidColorPaletteTag,
  validateEmotionTags,
  validateArchetypeTags,
  validateEssenceTags,
  validateLifestyleTags,
  validateValueTags,
  validateStyleProfile,
  validateUserPreferences,
  validatePhysicalProfile,
  validateCompleteUserProfile,
} from '@/lib/validation';

import { StyleProfile, UserPreferences, PhysicalProfile, UserProfile } from '@/types/user';

describe('Schema Validation', () => {
  describe('Individual Tag Validation', () => {
    describe('isValidEmotionTag', () => {
      it('should validate correct emotion tags', () => {
        expect(isValidEmotionTag('Confident')).toBe(true);
        expect(isValidEmotionTag('Powerful')).toBe(true);
        expect(isValidEmotionTag('Relaxed')).toBe(true);
        expect(isValidEmotionTag('Sensual')).toBe(true);
      });

      it('should reject invalid emotion tags', () => {
        expect(isValidEmotionTag('InvalidEmotion')).toBe(false);
        expect(isValidEmotionTag('confident')).toBe(false); // case sensitive
        expect(isValidEmotionTag('')).toBe(false);
        expect(isValidEmotionTag('Happy')).toBe(false); // not in schema
      });

      it('should validate all emotion schema tags', () => {
        EMOTIONS_SCHEMA.forEach(tag => {
          expect(isValidEmotionTag(tag)).toBe(true);
        });
      });
    });

    describe('isValidArchetypeTag', () => {
      it('should validate correct archetype tags', () => {
        expect(isValidArchetypeTag('The Innocent')).toBe(true);
        expect(isValidArchetypeTag('The Hero')).toBe(true);
        expect(isValidArchetypeTag('The Sage')).toBe(true);
      });

      it('should reject invalid archetype tags', () => {
        expect(isValidArchetypeTag('The Invalid')).toBe(false);
        expect(isValidArchetypeTag('Hero')).toBe(false); // missing "The"
        expect(isValidArchetypeTag('')).toBe(false);
      });

      it('should validate all archetype schema tags', () => {
        ARCHETYPE_SCHEMA.forEach(tag => {
          expect(isValidArchetypeTag(tag)).toBe(true);
        });
      });
    });

    describe('isValidEssenceTag', () => {
      it('should validate correct essence tags', () => {
        expect(isValidEssenceTag('Classic')).toBe(true);
        expect(isValidEssenceTag('Dramatic')).toBe(true);
        expect(isValidEssenceTag('Romantic')).toBe(true);
      });

      it('should reject invalid essence tags', () => {
        expect(isValidEssenceTag('Modern')).toBe(false);
        expect(isValidEssenceTag('classic')).toBe(false); // case sensitive
        expect(isValidEssenceTag('')).toBe(false);
      });

      it('should validate all essence schema tags', () => {
        ESSENCE_SCHEMA.forEach(tag => {
          expect(isValidEssenceTag(tag)).toBe(true);
        });
      });
    });

    describe('isValidLifestyleTag', () => {
      it('should validate correct lifestyle tags', () => {
        expect(isValidLifestyleTag('Professional')).toBe(true);
        expect(isValidLifestyleTag('Casual')).toBe(true);
        expect(isValidLifestyleTag('Fitness')).toBe(true);
      });

      it('should reject invalid lifestyle tags', () => {
        expect(isValidLifestyleTag('Work')).toBe(false);
        expect(isValidLifestyleTag('professional')).toBe(false); // case sensitive
        expect(isValidLifestyleTag('')).toBe(false);
      });

      it('should validate all lifestyle schema tags', () => {
        LIFESTYLE_SCHEMA.forEach(tag => {
          expect(isValidLifestyleTag(tag)).toBe(true);
        });
      });
    });

    describe('isValidValueTag', () => {
      it('should validate correct value tags', () => {
        expect(isValidValueTag('Sustainable')).toBe(true);
        expect(isValidValueTag('Luxury')).toBe(true);
        expect(isValidValueTag('Secondhand / Vintage')).toBe(true);
      });

      it('should reject invalid value tags', () => {
        expect(isValidValueTag('Cheap')).toBe(false);
        expect(isValidValueTag('sustainable')).toBe(false); // case sensitive
        expect(isValidValueTag('')).toBe(false);
      });

      it('should validate all value schema tags', () => {
        VALUES_SCHEMA.forEach(tag => {
          expect(isValidValueTag(tag)).toBe(true);
        });
      });
    });

    describe('isValidSilhouetteTag', () => {
      it('should validate correct silhouette tags', () => {
        expect(isValidSilhouetteTag('middle_balance')).toBe(true);
        expect(isValidSilhouetteTag('upper_balance')).toBe(true);
        expect(isValidSilhouetteTag('equal_balance')).toBe(true);
      });

      it('should reject invalid silhouette tags', () => {
        expect(isValidSilhouetteTag('pear')).toBe(false);
        expect(isValidSilhouetteTag('Middle_Balance')).toBe(false); // case sensitive
        expect(isValidSilhouetteTag('')).toBe(false);
      });

      it('should validate all silhouette schema tags', () => {
        SILHOUETTE_SCHEMA.forEach(tag => {
          expect(isValidSilhouetteTag(tag)).toBe(true);
        });
      });
    });

    describe('isValidColorPaletteTag', () => {
      it('should validate correct color palette tags', () => {
        expect(isValidColorPaletteTag('True Spring')).toBe(true);
        expect(isValidColorPaletteTag('Deep Winter')).toBe(true);
        expect(isValidColorPaletteTag('Soft Autumn')).toBe(true);
      });

      it('should reject invalid color palette tags', () => {
        expect(isValidColorPaletteTag('Spring')).toBe(false);
        expect(isValidColorPaletteTag('true spring')).toBe(false); // case sensitive
        expect(isValidColorPaletteTag('')).toBe(false);
      });

      it('should validate all color palette schema tags', () => {
        COLOR_PALETTE_SCHEMA.forEach(tag => {
          expect(isValidColorPaletteTag(tag)).toBe(true);
        });
      });
    });
  });

  describe('Tag Array Validation', () => {
    describe('validateEmotionTags', () => {
      it('should validate arrays of correct emotion tags', () => {
        const result = validateEmotionTags(['Confident', 'Powerful', 'Relaxed']);
        expect(result.valid).toBe(true);
        expect(result.validTags).toEqual(['Confident', 'Powerful', 'Relaxed']);
        expect(result.invalidTags).toEqual([]);
      });

      it('should separate valid and invalid emotion tags', () => {
        const result = validateEmotionTags(['Confident', 'Invalid', 'Powerful', 'BadTag']);
        expect(result.valid).toBe(false);
        expect(result.validTags).toEqual(['Confident', 'Powerful']);
        expect(result.invalidTags).toEqual(['Invalid', 'BadTag']);
      });

      it('should handle empty arrays', () => {
        const result = validateEmotionTags([]);
        expect(result.valid).toBe(true);
        expect(result.validTags).toEqual([]);
        expect(result.invalidTags).toEqual([]);
      });
    });

    describe('validateArchetypeTags', () => {
      it('should validate arrays of correct archetype tags', () => {
        const result = validateArchetypeTags(['The Hero', 'The Sage', 'The Creator']);
        expect(result.valid).toBe(true);
        expect(result.validTags).toEqual(['The Hero', 'The Sage', 'The Creator']);
        expect(result.invalidTags).toEqual([]);
      });

      it('should separate valid and invalid archetype tags', () => {
        const result = validateArchetypeTags(['The Hero', 'Invalid', 'The Sage']);
        expect(result.valid).toBe(false);
        expect(result.validTags).toEqual(['The Hero', 'The Sage']);
        expect(result.invalidTags).toEqual(['Invalid']);
      });
    });

    describe('validateEssenceTags', () => {
      it('should validate arrays of correct essence tags', () => {
        const result = validateEssenceTags(['Classic', 'Dramatic']);
        expect(result.valid).toBe(true);
        expect(result.validTags).toEqual(['Classic', 'Dramatic']);
        expect(result.invalidTags).toEqual([]);
      });

      it('should separate valid and invalid essence tags', () => {
        const result = validateEssenceTags(['Classic', 'Modern', 'Dramatic']);
        expect(result.valid).toBe(false);
        expect(result.validTags).toEqual(['Classic', 'Dramatic']);
        expect(result.invalidTags).toEqual(['Modern']);
      });
    });

    describe('validateLifestyleTags', () => {
      it('should validate arrays of correct lifestyle tags', () => {
        const result = validateLifestyleTags(['Professional', 'Casual']);
        expect(result.valid).toBe(true);
        expect(result.validTags).toEqual(['Professional', 'Casual']);
        expect(result.invalidTags).toEqual([]);
      });

      it('should separate valid and invalid lifestyle tags', () => {
        const result = validateLifestyleTags(['Professional', 'Work', 'Casual']);
        expect(result.valid).toBe(false);
        expect(result.validTags).toEqual(['Professional', 'Casual']);
        expect(result.invalidTags).toEqual(['Work']);
      });
    });

    describe('validateValueTags', () => {
      it('should validate arrays of correct value tags', () => {
        const result = validateValueTags(['Sustainable', 'Luxury']);
        expect(result.valid).toBe(true);
        expect(result.validTags).toEqual(['Sustainable', 'Luxury']);
        expect(result.invalidTags).toEqual([]);
      });

      it('should separate valid and invalid value tags', () => {
        const result = validateValueTags(['Sustainable', 'Cheap', 'Luxury']);
        expect(result.valid).toBe(false);
        expect(result.validTags).toEqual(['Sustainable', 'Luxury']);
        expect(result.invalidTags).toEqual(['Cheap']);
      });
    });
  });

  describe('Profile Validation', () => {
    describe('validateStyleProfile', () => {
      it('should validate complete style profiles', () => {
        const profile: StyleProfile = {
          emotions: ['Confident', 'Powerful'],
          archetype: ['The Hero', 'The Ruler'],
          essence: ['Classic', 'Dramatic'],
          lifestyle: ['Professional', 'Social'],
          values: ['Luxury', 'High Quality'],
        };

        const result = validateStyleProfile(profile);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should validate partial style profiles', () => {
        const profile: Partial<StyleProfile> = {
          emotions: ['Confident'],
          lifestyle: ['Casual'],
        };

        const result = validateStyleProfile(profile);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should collect all validation errors', () => {
        const profile: Partial<StyleProfile> = {
          emotions: ['Confident', 'Invalid'],
          archetype: ['The Hero', 'BadArchetype'],
          essence: ['Classic', 'Modern'],
          lifestyle: ['Professional', 'Work'],
          values: ['Luxury', 'Cheap'],
        };

        const result = validateStyleProfile(profile);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid emotion tags: Invalid');
        expect(result.errors).toContain('Invalid archetype tags: BadArchetype');
        expect(result.errors).toContain('Invalid essence tags: Modern');
        expect(result.errors).toContain('Invalid lifestyle tags: Work');
        expect(result.errors).toContain('Invalid value tags: Cheap');
      });
    });

    describe('validateUserPreferences', () => {
      it('should validate correct user preferences', () => {
        const preferences: UserPreferences = {
          zipCode: '12345',
          maxBudget: 500,
        };

        const result = validateUserPreferences(preferences);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should validate zip codes with extensions', () => {
        const preferences: Partial<UserPreferences> = {
          zipCode: '12345-6789',
        };

        const result = validateUserPreferences(preferences);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject invalid zip codes', () => {
        const preferences: Partial<UserPreferences> = {
          zipCode: 'invalid',
        };

        const result = validateUserPreferences(preferences);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid zip code format');
      });

      it('should reject negative budgets', () => {
        const preferences: Partial<UserPreferences> = {
          maxBudget: -100,
        };

        const result = validateUserPreferences(preferences);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Budget must be a positive number');
      });
    });

    describe('validatePhysicalProfile', () => {
      it('should validate complete physical profiles', () => {
        const profile: PhysicalProfile = {
          bodyShape: 'middle_balance',
          bodyShapeConfidence: 0.85,
          colorPalette: {
            season: 'True Spring',
            colors: ['#FF6B6B', '#4ECDC4'],
            confidence: 0.9,
            skinTone: 'warm',
            hairColor: 'blonde',
            eyeColor: 'blue',
          },
        };

        const result = validatePhysicalProfile(profile);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject invalid body shapes', () => {
        const profile: Partial<PhysicalProfile> = {
          bodyShape: 'pear' as SilhouetteTag,
        };

        const result = validatePhysicalProfile(profile);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid body shape: pear');
      });

      it('should reject invalid confidence scores', () => {
        const profile: Partial<PhysicalProfile> = {
          bodyShapeConfidence: 1.5,
        };

        const result = validatePhysicalProfile(profile);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Body shape confidence must be a number between 0 and 1');
      });

      it('should reject invalid color palette seasons', () => {
        const profile: Partial<PhysicalProfile> = {
          colorPalette: {
            season: 'Spring' as ColorPaletteTag,
            colors: [],
            confidence: 0.8,
          },
        };

        const result = validatePhysicalProfile(profile);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid color palette season: Spring');
      });
    });

    describe('validateCompleteUserProfile', () => {
      it('should validate complete user profiles', () => {
        const profile: Partial<UserProfile> = {
          email: 'test@example.com',
          styleProfile: {
            emotions: ['Confident'],
            archetype: ['The Hero'],
            essence: ['Classic'],
            lifestyle: ['Professional'],
            values: ['Luxury'],
          },
          preferences: {
            zipCode: '12345',
            maxBudget: 500,
          },
          physicalProfile: {
            bodyShape: 'middle_balance',
            bodyShapeConfidence: 0.85,
            colorPalette: {
              season: 'True Spring',
              colors: ['#FF6B6B'],
              confidence: 0.9,
            },
          },
        };

        const result = validateCompleteUserProfile(profile);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should collect errors from all profile sections', () => {
        const profile: Partial<UserProfile> = {
          email: 'invalid-email',
          styleProfile: {
            emotions: ['Invalid'],
            archetype: ['The Hero'],
            essence: ['Classic'],
            lifestyle: ['Professional'],
            values: ['Luxury'],
          },
          preferences: {
            zipCode: 'invalid',
            maxBudget: -100,
          },
          physicalProfile: {
            bodyShape: 'pear' as SilhouetteTag,
            bodyShapeConfidence: 1.5,
            colorPalette: {
              season: 'Spring' as ColorPaletteTag,
              colors: [],
              confidence: 0.8,
            },
          },
        };

        const result = validateCompleteUserProfile(profile);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors).toContain('Invalid email format');
        expect(result.errors).toContain('Invalid emotion tags: Invalid');
        expect(result.errors).toContain('Invalid zip code format');
        expect(result.errors).toContain('Budget must be a positive number');
        expect(result.errors).toContain('Invalid body shape: pear');
        expect(result.errors).toContain('Body shape confidence must be a number between 0 and 1');
        expect(result.errors).toContain('Invalid color palette season: Spring');
      });
    });
  });

  describe('Schema Completeness', () => {
    it('should have all required emotion tags', () => {
      const expectedEmotions = [
        'Confident', 'Powerful', 'Relaxed', 'Chic', 'Romantic', 'Playful',
        'Effortless', 'Feminine', 'Bold', 'Grounded', 'Comfortable', 'Polished',
        'Creative', 'Cool', 'Sensual'
      ];
      expect(EMOTIONS_SCHEMA).toEqual(expectedEmotions);
    });

    it('should have all required archetype tags', () => {
      const expectedArchetypes = [
        'The Innocent', 'The Everyman', 'The Hero', 'The Outlaw', 'The Explorer',
        'The Creator', 'The Ruler', 'The Magician', 'The Lover', 'The Caregiver',
        'The Jester', 'The Sage'
      ];
      expect(ARCHETYPE_SCHEMA).toEqual(expectedArchetypes);
    });

    it('should have all required essence tags', () => {
      const expectedEssences = [
        'Classic', 'Dramatic', 'Ethereal', 'Gamine', 'Ingenue', 'Natural', 'Romantic'
      ];
      expect(ESSENCE_SCHEMA).toEqual(expectedEssences);
    });

    it('should have all required lifestyle tags', () => {
      const expectedLifestyles = ['Professional', 'Social', 'Casual', 'Fitness', 'Leisure'];
      expect(LIFESTYLE_SCHEMA).toEqual(expectedLifestyles);
    });

    it('should have all required value tags', () => {
      const expectedValues = [
        'Sustainable', 'Vegan', 'Secondhand / Vintage', 'Luxury', 'Minimal Quantity',
        'High Quality', 'Artistic / Experimental', 'Trend-Driven', 'Timeless / Classic',
        'Cultural / Heritage', 'Local / Independent', 'Comfort-First', 'Identity-Aligned',
        'Modest', 'Collectibles'
      ];
      expect(VALUES_SCHEMA).toEqual(expectedValues);
    });

    it('should have all required silhouette tags', () => {
      const expectedSilhouettes = [
        'middle_balance', 'lower_balance', 'waist_balance', 'upper_balance', 'equal_balance'
      ];
      expect(SILHOUETTE_SCHEMA).toEqual(expectedSilhouettes);
    });

    it('should have all required color palette tags', () => {
      const expectedColorPalettes = [
        'True Spring', 'Light Spring', 'Deep Spring', 'True Summer', 'Light Summer',
        'Soft Summer', 'True Autumn', 'Soft Autumn', 'Deep Autumn', 'True Winter',
        'Bright Winter', 'Deep Winter'
      ];
      expect(COLOR_PALETTE_SCHEMA).toEqual(expectedColorPalettes);
    });
  });
});