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
import { StyleProfile, UserPreferences, PhysicalProfile } from '@/types/user';

// User authentication validation
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  // Check for at least one uppercase, one lowercase, and one number
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return { 
      valid: false, 
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
    };
  }
  
  return { valid: true };
}

export function validateRegistrationData(data: { email: string; password: string }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.push(emailValidation.error!);
  }
  
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.push(passwordValidation.error!);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Schema validation functions
export function isValidEmotionTag(tag: string): tag is EmotionTag {
  return EMOTIONS_SCHEMA.includes(tag as EmotionTag);
}

export function isValidArchetypeTag(tag: string): tag is ArchetypeTag {
  return ARCHETYPE_SCHEMA.includes(tag as ArchetypeTag);
}

export function isValidEssenceTag(tag: string): tag is EssenceTag {
  return ESSENCE_SCHEMA.includes(tag as EssenceTag);
}

export function isValidLifestyleTag(tag: string): tag is LifestyleTag {
  return LIFESTYLE_SCHEMA.includes(tag as LifestyleTag);
}

export function isValidValueTag(tag: string): tag is ValueTag {
  return VALUES_SCHEMA.includes(tag as ValueTag);
}

export function isValidSilhouetteTag(tag: string): tag is SilhouetteTag {
  return SILHOUETTE_SCHEMA.includes(tag as SilhouetteTag);
}

export function isValidColorPaletteTag(tag: string): tag is ColorPaletteTag {
  return COLOR_PALETTE_SCHEMA.includes(tag as ColorPaletteTag);
}

// Style profile validation
export function validateStyleProfile(profile: Partial<StyleProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (profile.emotions) {
    const invalidEmotions = profile.emotions.filter(tag => !isValidEmotionTag(tag));
    if (invalidEmotions.length > 0) {
      errors.push(`Invalid emotion tags: ${invalidEmotions.join(', ')}`);
    }
  }

  if (profile.archetype) {
    const invalidArchetypes = profile.archetype.filter(tag => !isValidArchetypeTag(tag));
    if (invalidArchetypes.length > 0) {
      errors.push(`Invalid archetype tags: ${invalidArchetypes.join(', ')}`);
    }
  }

  if (profile.essence) {
    const invalidEssences = profile.essence.filter(tag => !isValidEssenceTag(tag));
    if (invalidEssences.length > 0) {
      errors.push(`Invalid essence tags: ${invalidEssences.join(', ')}`);
    }
  }

  if (profile.lifestyle) {
    const invalidLifestyles = profile.lifestyle.filter(tag => !isValidLifestyleTag(tag));
    if (invalidLifestyles.length > 0) {
      errors.push(`Invalid lifestyle tags: ${invalidLifestyles.join(', ')}`);
    }
  }

  if (profile.values) {
    const invalidValues = profile.values.filter(tag => !isValidValueTag(tag));
    if (invalidValues.length > 0) {
      errors.push(`Invalid value tags: ${invalidValues.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// User preferences validation
export function validateUserPreferences(preferences: Partial<UserPreferences>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (preferences.zipCode) {
    const zipCodeRegex = /^\d{5}(-\d{4})?$/;
    if (!zipCodeRegex.test(preferences.zipCode)) {
      errors.push('Invalid zip code format');
    }
  }

  if (preferences.maxBudget !== undefined) {
    if (typeof preferences.maxBudget !== 'number' || preferences.maxBudget < 0) {
      errors.push('Budget must be a positive number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Physical profile validation
export function validatePhysicalProfile(profile: Partial<PhysicalProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (profile.bodyShape && !isValidSilhouetteTag(profile.bodyShape)) {
    errors.push(`Invalid body shape: ${profile.bodyShape}`);
  }

  if (profile.bodyShapeConfidence !== undefined) {
    if (typeof profile.bodyShapeConfidence !== 'number' || 
        profile.bodyShapeConfidence < 0 || 
        profile.bodyShapeConfidence > 1) {
      errors.push('Body shape confidence must be a number between 0 and 1');
    }
  }

  if (profile.colorPalette) {
    if (!isValidColorPaletteTag(profile.colorPalette.season)) {
      errors.push(`Invalid color palette season: ${profile.colorPalette.season}`);
    }

    if (profile.colorPalette.confidence !== undefined) {
      if (typeof profile.colorPalette.confidence !== 'number' || 
          profile.colorPalette.confidence < 0 || 
          profile.colorPalette.confidence > 1) {
        errors.push('Color palette confidence must be a number between 0 and 1');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Schema tag array validation functions
export function validateEmotionTags(tags: string[]): {
  valid: boolean;
  validTags: EmotionTag[];
  invalidTags: string[];
} {
  const validTags: EmotionTag[] = [];
  const invalidTags: string[] = [];

  tags.forEach(tag => {
    if (isValidEmotionTag(tag)) {
      validTags.push(tag);
    } else {
      invalidTags.push(tag);
    }
  });

  return {
    valid: invalidTags.length === 0,
    validTags,
    invalidTags,
  };
}

export function validateArchetypeTags(tags: string[]): {
  valid: boolean;
  validTags: ArchetypeTag[];
  invalidTags: string[];
} {
  const validTags: ArchetypeTag[] = [];
  const invalidTags: string[] = [];

  tags.forEach(tag => {
    if (isValidArchetypeTag(tag)) {
      validTags.push(tag);
    } else {
      invalidTags.push(tag);
    }
  });

  return {
    valid: invalidTags.length === 0,
    validTags,
    invalidTags,
  };
}

export function validateEssenceTags(tags: string[]): {
  valid: boolean;
  validTags: EssenceTag[];
  invalidTags: string[];
} {
  const validTags: EssenceTag[] = [];
  const invalidTags: string[] = [];

  tags.forEach(tag => {
    if (isValidEssenceTag(tag)) {
      validTags.push(tag);
    } else {
      invalidTags.push(tag);
    }
  });

  return {
    valid: invalidTags.length === 0,
    validTags,
    invalidTags,
  };
}

export function validateLifestyleTags(tags: string[]): {
  valid: boolean;
  validTags: LifestyleTag[];
  invalidTags: string[];
} {
  const validTags: LifestyleTag[] = [];
  const invalidTags: string[] = [];

  tags.forEach(tag => {
    if (isValidLifestyleTag(tag)) {
      validTags.push(tag);
    } else {
      invalidTags.push(tag);
    }
  });

  return {
    valid: invalidTags.length === 0,
    validTags,
    invalidTags,
  };
}

export function validateValueTags(tags: string[]): {
  valid: boolean;
  validTags: ValueTag[];
  invalidTags: string[];
} {
  const validTags: ValueTag[] = [];
  const invalidTags: string[] = [];

  tags.forEach(tag => {
    if (isValidValueTag(tag)) {
      validTags.push(tag);
    } else {
      invalidTags.push(tag);
    }
  });

  return {
    valid: invalidTags.length === 0,
    validTags,
    invalidTags,
  };
}

// Complete user profile validation
export function validateCompleteUserProfile(profile: Partial<UserProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate email
  if (profile.email) {
    const emailValidation = validateEmail(profile.email);
    if (!emailValidation.valid) {
      errors.push(emailValidation.error!);
    }
  }

  // Validate style profile
  if (profile.styleProfile) {
    const styleValidation = validateStyleProfile(profile.styleProfile);
    if (!styleValidation.valid) {
      errors.push(...styleValidation.errors);
    }
  }

  // Validate preferences
  if (profile.preferences) {
    const preferencesValidation = validateUserPreferences(profile.preferences);
    if (!preferencesValidation.valid) {
      errors.push(...preferencesValidation.errors);
    }
  }

  // Validate physical profile
  if (profile.physicalProfile) {
    const physicalValidation = validatePhysicalProfile(profile.physicalProfile);
    if (!physicalValidation.valid) {
      errors.push(...physicalValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
// Schema mapping and extraction utilities for AI conversation
export function extractValidTagsFromText(text: string, schemaType: 'emotions' | 'archetype' | 'essence' | 'lifestyle' | 'values'): string[] {
  const textLower = text.toLowerCase();
  let schema: readonly string[];
  
  switch (schemaType) {
    case 'emotions':
      schema = EMOTIONS_SCHEMA;
      break;
    case 'archetype':
      schema = ARCHETYPE_SCHEMA;
      break;
    case 'essence':
      schema = ESSENCE_SCHEMA;
      break;
    case 'lifestyle':
      schema = LIFESTYLE_SCHEMA;
      break;
    case 'values':
      schema = VALUES_SCHEMA;
      break;
    default:
      return [];
  }
  
  return schema.filter(tag => 
    textLower.includes(tag.toLowerCase()) ||
    tag.toLowerCase().includes(textLower)
  );
}

// Confidence scoring for schema tag assignments
export function calculateTagConfidence(userInput: string, suggestedTags: string[]): Record<string, number> {
  const confidence: Record<string, number> = {};
  const inputLower = userInput.toLowerCase().trim();
  
  suggestedTags.forEach(tag => {
    const tagLower = tag.toLowerCase();
    let score = 0;
    
    // Handle empty input
    if (!inputLower) {
      score = 0.3;
    }
    // Exact match gets highest score
    else if (inputLower.includes(tagLower)) {
      score = 0.9;
    }
    // Partial word match
    else if (tagLower.split(' ').some(word => inputLower.includes(word))) {
      score = 0.7;
    }
    // Reverse match (tag contains input)
    else if (tagLower.includes(inputLower)) {
      score = 0.6;
    }
    // Default low confidence for suggested tags
    else {
      score = 0.3;
    }
    
    confidence[tag] = score;
  });
  
  return confidence;
}

// Validation for AI-extracted profile data
export interface ExtractedProfileData {
  emotions?: string[];
  archetype?: string[];
  essence?: string[];
  lifestyle?: string[];
  values?: string[];
  zipCode?: string;
  maxBudget?: number;
}

export function validateExtractedProfileData(data: ExtractedProfileData): {
  valid: boolean;
  errors: string[];
  validatedData: {
    emotions: EmotionTag[];
    archetype: ArchetypeTag[];
    essence: EssenceTag[];
    lifestyle: LifestyleTag[];
    values: ValueTag[];
    zipCode?: string;
    maxBudget?: number;
  };
} {
  const errors: string[] = [];
  const validatedData = {
    emotions: [] as EmotionTag[],
    archetype: [] as ArchetypeTag[],
    essence: [] as EssenceTag[],
    lifestyle: [] as LifestyleTag[],
    values: [] as ValueTag[],
    zipCode: data.zipCode,
    maxBudget: data.maxBudget,
  };

  // Validate and filter emotion tags
  if (data.emotions) {
    const emotionValidation = validateEmotionTags(data.emotions);
    validatedData.emotions = emotionValidation.validTags;
    if (emotionValidation.invalidTags.length > 0) {
      errors.push(`Invalid emotion tags: ${emotionValidation.invalidTags.join(', ')}`);
    }
  }

  // Validate and filter archetype tags
  if (data.archetype) {
    const archetypeValidation = validateArchetypeTags(data.archetype);
    validatedData.archetype = archetypeValidation.validTags;
    if (archetypeValidation.invalidTags.length > 0) {
      errors.push(`Invalid archetype tags: ${archetypeValidation.invalidTags.join(', ')}`);
    }
  }

  // Validate and filter essence tags
  if (data.essence) {
    const essenceValidation = validateEssenceTags(data.essence);
    validatedData.essence = essenceValidation.validTags;
    if (essenceValidation.invalidTags.length > 0) {
      errors.push(`Invalid essence tags: ${essenceValidation.invalidTags.join(', ')}`);
    }
  }

  // Validate and filter lifestyle tags
  if (data.lifestyle) {
    const lifestyleValidation = validateLifestyleTags(data.lifestyle);
    validatedData.lifestyle = lifestyleValidation.validTags;
    if (lifestyleValidation.invalidTags.length > 0) {
      errors.push(`Invalid lifestyle tags: ${lifestyleValidation.invalidTags.join(', ')}`);
    }
  }

  // Validate and filter value tags
  if (data.values) {
    const valueValidation = validateValueTags(data.values);
    validatedData.values = valueValidation.validTags;
    if (valueValidation.invalidTags.length > 0) {
      errors.push(`Invalid value tags: ${valueValidation.invalidTags.join(', ')}`);
    }
  }

  // Validate preferences
  if (data.zipCode || data.maxBudget !== undefined) {
    const preferencesValidation = validateUserPreferences({
      zipCode: data.zipCode,
      maxBudget: data.maxBudget,
    });
    if (!preferencesValidation.valid) {
      errors.push(...preferencesValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validatedData,
  };
}