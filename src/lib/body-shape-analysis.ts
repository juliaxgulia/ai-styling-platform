import { SilhouetteTag, SILHOUETTE_SCHEMA } from '@/types/schemas';
import { BodyShapeAnalysis } from '@/types/user';

export const CONFIDENCE_THRESHOLD = 0.7;

export interface BodyShapeAnalysisResult extends BodyShapeAnalysis {
  reasoning: string;
}

export function validateBodyShapeAnalysis(result: any): { valid: boolean; error?: string } {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return { valid: false, error: 'Invalid analysis result format' };
  }

  if (!result.bodyShape || !SILHOUETTE_SCHEMA.includes(result.bodyShape)) {
    return { valid: false, error: 'Invalid body shape category' };
  }

  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    return { valid: false, error: 'Invalid confidence score' };
  }

  if (!result.reasoning || typeof result.reasoning !== 'string') {
    return { valid: false, error: 'Missing or invalid reasoning' };
  }

  return { valid: true };
}

export function requiresAdditionalPhoto(confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLD;
}

export function getBodyShapeAnalysisPrompt(): string {
  return `Analyze this full-body photo to determine the body shape category. Provide your analysis in this exact JSON format:

{
  "bodyShape": "category_name",
  "confidence": 0.85,
  "reasoning": "Brief explanation of your analysis focusing on proportions and silhouette"
}

The bodyShape must be one of: ${SILHOUETTE_SCHEMA.join(', ')}
Confidence should be between 0.0 and 1.0

Focus on:
- Overall silhouette and proportions
- Where the person carries most of their weight/volume
- Balance between upper body, waist, and lower body
- Be objective and professional in your assessment`;
}

export function getBodyShapeSystemPrompt(): string {
  return `You are a professional body shape analyst. Analyze the full-body photo to determine the person's body silhouette according to these specific categories:

- middle_balance: Weight/volume concentrated in the torso/middle section
- lower_balance: Weight/volume concentrated in hips, thighs, and lower body  
- waist_balance: Defined waist with balanced proportions between upper and lower body
- upper_balance: Weight/volume concentrated in shoulders, bust, and upper body
- equal_balance: Even weight/volume distribution throughout the body

Focus on silhouette and proportions, not body size. Be objective and professional. Provide accurate confidence scores based on photo clarity and how clearly the body shape can be determined.`;
}