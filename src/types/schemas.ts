// Style Profile Schemas as defined in the design document

export const EMOTIONS_SCHEMA = [
  'Confident',
  'Powerful',
  'Relaxed',
  'Chic',
  'Romantic',
  'Playful',
  'Effortless',
  'Feminine',
  'Bold',
  'Grounded',
  'Comfortable',
  'Polished',
  'Creative',
  'Cool',
  'Sensual'
] as const;

export const ARCHETYPE_SCHEMA = [
  'The Innocent',
  'The Everyman',
  'The Hero',
  'The Outlaw',
  'The Explorer',
  'The Creator',
  'The Ruler',
  'The Magician',
  'The Lover',
  'The Caregiver',
  'The Jester',
  'The Sage'
] as const;

export const ESSENCE_SCHEMA = [
  'Classic',
  'Dramatic',
  'Ethereal',
  'Gamine',
  'Ingenue',
  'Natural',
  'Romantic'
] as const;

export const LIFESTYLE_SCHEMA = [
  'Professional',
  'Social',
  'Casual',
  'Fitness',
  'Leisure'
] as const;

export const VALUES_SCHEMA = [
  'Sustainable',
  'Vegan',
  'Secondhand / Vintage',
  'Luxury',
  'Minimal Quantity',
  'High Quality',
  'Artistic / Experimental',
  'Trend-Driven',
  'Timeless / Classic',
  'Cultural / Heritage',
  'Local / Independent',
  'Comfort-First',
  'Identity-Aligned',
  'Modest',
  'Collectibles'
] as const;

export const SILHOUETTE_SCHEMA = [
  'middle_balance',
  'lower_balance',
  'waist_balance',
  'upper_balance',
  'equal_balance'
] as const;

export const COLOR_PALETTE_SCHEMA = [
  'True Spring',
  'Light Spring',
  'Deep Spring',
  'True Summer',
  'Light Summer',
  'Soft Summer',
  'True Autumn',
  'Soft Autumn',
  'Deep Autumn',
  'True Winter',
  'Bright Winter',
  'Deep Winter'
] as const;

// Type definitions
export type EmotionTag = typeof EMOTIONS_SCHEMA[number];
export type ArchetypeTag = typeof ARCHETYPE_SCHEMA[number];
export type EssenceTag = typeof ESSENCE_SCHEMA[number];
export type LifestyleTag = typeof LIFESTYLE_SCHEMA[number];
export type ValueTag = typeof VALUES_SCHEMA[number];
export type SilhouetteTag = typeof SILHOUETTE_SCHEMA[number];
export type ColorPaletteTag = typeof COLOR_PALETTE_SCHEMA[number];

// Schema metadata for AI conversation system
export interface SchemaInfo {
  name: string;
  description: string;
  tags: readonly string[];
  examples: string[];
}

export const SCHEMA_METADATA: Record<string, SchemaInfo> = {
  EMOTIONS: {
    name: 'Emotions',
    description: 'How users want to feel in their clothes',
    tags: EMOTIONS_SCHEMA,
    examples: ['Confident', 'Relaxed', 'Powerful', 'Chic']
  },
  ARCHETYPE: {
    name: 'Personality Archetype',
    description: 'Personality-based style preferences',
    tags: ARCHETYPE_SCHEMA,
    examples: ['The Hero', 'The Creator', 'The Sage', 'The Lover']
  },
  ESSENCE: {
    name: 'Style Essence',
    description: 'Core style modes and aesthetics',
    tags: ESSENCE_SCHEMA,
    examples: ['Classic', 'Dramatic', 'Natural', 'Romantic']
  },
  LIFESTYLE: {
    name: 'Lifestyle',
    description: 'Daily life patterns and activities',
    tags: LIFESTYLE_SCHEMA,
    examples: ['Professional', 'Casual', 'Social', 'Fitness']
  },
  VALUES: {
    name: 'Values',
    description: 'Ideal style preferences and personal values',
    tags: VALUES_SCHEMA,
    examples: ['Sustainable', 'Luxury', 'High Quality', 'Timeless / Classic']
  },
  SILHOUETTE: {
    name: 'Body Silhouette',
    description: 'Body shape classifications for fit recommendations',
    tags: SILHOUETTE_SCHEMA,
    examples: ['middle_balance', 'upper_balance', 'waist_balance']
  },
  COLOR_PALETTE: {
    name: 'Color Palette',
    description: 'Seasonal color analysis classifications',
    tags: COLOR_PALETTE_SCHEMA,
    examples: ['True Spring', 'Deep Winter', 'Soft Autumn', 'Light Summer']
  }
};

// Helper functions for schema operations
export function getAllSchemaTypes(): string[] {
  return Object.keys(SCHEMA_METADATA);
}

export function getSchemaInfo(schemaType: string): SchemaInfo | null {
  return SCHEMA_METADATA[schemaType] || null;
}

export function getAllSchemaTags(): Record<string, readonly string[]> {
  return {
    emotions: EMOTIONS_SCHEMA,
    archetype: ARCHETYPE_SCHEMA,
    essence: ESSENCE_SCHEMA,
    lifestyle: LIFESTYLE_SCHEMA,
    values: VALUES_SCHEMA,
    silhouette: SILHOUETTE_SCHEMA,
    colorPalette: COLOR_PALETTE_SCHEMA,
  };
}

// Schema tag search and matching utilities
export function findSimilarTags(input: string, schemaType: keyof typeof SCHEMA_METADATA): string[] {
  const schema = SCHEMA_METADATA[schemaType];
  if (!schema) return [];
  
  const inputLower = input.toLowerCase();
  return schema.tags.filter(tag => 
    tag.toLowerCase().includes(inputLower) || 
    inputLower.includes(tag.toLowerCase())
  );
}

export function getRandomSchemaExamples(schemaType: keyof typeof SCHEMA_METADATA, count: number = 3): string[] {
  const schema = SCHEMA_METADATA[schemaType];
  if (!schema) return [];
  
  const shuffled = [...schema.tags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, schema.tags.length));
}