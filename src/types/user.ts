import { 
  EmotionTag, 
  ArchetypeTag, 
  EssenceTag, 
  LifestyleTag, 
  ValueTag, 
  SilhouetteTag, 
  ColorPaletteTag 
} from './schemas';

// User Profile Types based on DynamoDB design
export interface StyleProfile {
  emotions: EmotionTag[];
  archetype: ArchetypeTag[];
  essence: EssenceTag[];
  lifestyle: LifestyleTag[];
  values: ValueTag[];
}

export interface UserPreferences {
  zipCode: string;
  maxBudget: number;
}

export interface ColorPalette {
  season: ColorPaletteTag;
  colors: string[];
  confidence: number;
  skinTone?: string;
  hairColor?: string;
  eyeColor?: string;
}

export interface PhysicalProfile {
  bodyShape: SilhouetteTag;
  bodyShapeConfidence: number;
  colorPalette: ColorPalette;
}

export interface AnalysisPhotos {
  bodyPhotoUrl?: string;
  portraitPhotoUrl?: string;
}

export interface UserProfile {
  PK: string; // "USER#userId"
  SK: string; // "PROFILE"
  email: string;
  createdAt: string;
  styleProfile: StyleProfile;
  preferences: UserPreferences;
  physicalProfile?: PhysicalProfile;
  analysisPhotos?: AnalysisPhotos;
}

// Onboarding Session Types
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExtractedData {
  emotions?: EmotionTag[];
  archetype?: ArchetypeTag[];
  essence?: EssenceTag[];
  lifestyle?: LifestyleTag[];
  values?: ValueTag[];
  zipCode?: string;
  maxBudget?: number;
}

export interface OnboardingSession {
  PK: string; // "USER#userId"
  SK: string; // "ONBOARDING#sessionId"
  conversationHistory: ConversationMessage[];
  currentStep: string;
  extractedData: ExtractedData;
  isComplete: boolean;
  createdAt: string;
}

// Analysis Results Types
export interface BodyShapeAnalysis {
  bodyShape: SilhouetteTag;
  confidence: number;
}

export interface ColorPaletteAnalysis {
  season: ColorPaletteTag;
  colors: string[];
  skinTone: string;
  hairColor: string;
  eyeColor: string;
}

export interface AnalysisResults {
  PK: string; // "USER#userId"
  SK: string; // "ANALYSIS#analysisId"
  type: 'body-shape' | 'color-palette';
  imageUrl: string;
  results: {
    bodyShape?: SilhouetteTag;
    confidence?: number;
    colorPalette?: ColorPaletteAnalysis;
  };
  userConfirmed: boolean;
  createdAt: string;
}

// API Request/Response Types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  hasCompletedOnboarding: boolean;
  hasPhysicalProfile: boolean;
}

export interface UpdateProfileRequest {
  styleProfile?: Partial<StyleProfile>;
  preferences?: Partial<UserPreferences>;
  physicalProfile?: Partial<PhysicalProfile>;
  analysisPhotos?: Partial<AnalysisPhotos>;
}