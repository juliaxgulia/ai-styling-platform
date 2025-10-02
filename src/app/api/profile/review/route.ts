import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { StyleProfile, UserPreferences } from '@/types/user';
import { 
  SCHEMA_METADATA,
  EmotionTag,
  ArchetypeTag,
  EssenceTag,
  LifestyleTag,
  ValueTag
} from '@/types/schemas';

interface ReviewProfileRequest {
  styleProfile?: Partial<StyleProfile>;
  preferences?: Partial<UserPreferences>;
  feedback?: string;
}

interface ReviewProfileResponse {
  updatedProfile: {
    styleProfile: StyleProfile;
    preferences: UserPreferences;
  };
  suggestions?: string[];
}

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return createErrorResponse('Unauthorized', 401);
    }

    const userId = authResult.user.id;

    // Get the user's current profile
    const userProfile = await dynamoService.getUserProfile(userId);
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    if (!userProfile.styleProfile || !userProfile.preferences) {
      return createErrorResponse('Style profile not complete', 400);
    }

    return createApiResponse({
      profile: {
        styleProfile: userProfile.styleProfile,
        preferences: userProfile.preferences,
      },
      availableOptions: {
        emotions: SCHEMA_METADATA.EMOTIONS.tags,
        archetype: SCHEMA_METADATA.ARCHETYPE.tags,
        essence: SCHEMA_METADATA.ESSENCE.tags,
        lifestyle: SCHEMA_METADATA.LIFESTYLE.tags,
        values: SCHEMA_METADATA.VALUES.tags,
      }
    });

  } catch (error) {
    console.error('Get profile review error:', error);
    return createErrorResponse('Failed to get profile for review', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return createErrorResponse('Unauthorized', 401);
    }

    const userId = authResult.user.id;
    const body: ReviewProfileRequest = await request.json();

    // Get the user's current profile
    const userProfile = await dynamoService.getUserProfile(userId);
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    if (!userProfile.styleProfile || !userProfile.preferences) {
      return createErrorResponse('Style profile not complete', 400);
    }

    // Validate and merge the updates
    const updatedStyleProfile = { ...userProfile.styleProfile };
    const updatedPreferences = { ...userProfile.preferences };

    if (body.styleProfile) {
      // Validate emotion tags
      if (body.styleProfile.emotions) {
        const validEmotions = body.styleProfile.emotions.filter(tag => 
          SCHEMA_METADATA.EMOTIONS.tags.includes(tag as EmotionTag)
        ) as EmotionTag[];
        if (validEmotions.length > 0) {
          updatedStyleProfile.emotions = validEmotions;
        }
      }

      // Validate archetype tags
      if (body.styleProfile.archetype) {
        const validArchetypes = body.styleProfile.archetype.filter(tag => 
          SCHEMA_METADATA.ARCHETYPE.tags.includes(tag as ArchetypeTag)
        ) as ArchetypeTag[];
        if (validArchetypes.length > 0) {
          updatedStyleProfile.archetype = validArchetypes;
        }
      }

      // Validate essence tags
      if (body.styleProfile.essence) {
        const validEssences = body.styleProfile.essence.filter(tag => 
          SCHEMA_METADATA.ESSENCE.tags.includes(tag as EssenceTag)
        ) as EssenceTag[];
        if (validEssences.length > 0) {
          updatedStyleProfile.essence = validEssences;
        }
      }

      // Validate lifestyle tags
      if (body.styleProfile.lifestyle) {
        const validLifestyles = body.styleProfile.lifestyle.filter(tag => 
          SCHEMA_METADATA.LIFESTYLE.tags.includes(tag as LifestyleTag)
        ) as LifestyleTag[];
        if (validLifestyles.length > 0) {
          updatedStyleProfile.lifestyle = validLifestyles;
        }
      }

      // Validate value tags
      if (body.styleProfile.values) {
        const validValues = body.styleProfile.values.filter(tag => 
          SCHEMA_METADATA.VALUES.tags.includes(tag as ValueTag)
        ) as ValueTag[];
        if (validValues.length > 0) {
          updatedStyleProfile.values = validValues;
        }
      }
    }

    if (body.preferences) {
      // Validate zip code
      if (body.preferences.zipCode) {
        const zipPattern = /^\d{5}$/;
        if (zipPattern.test(body.preferences.zipCode)) {
          updatedPreferences.zipCode = body.preferences.zipCode;
        }
      }

      // Validate budget
      if (body.preferences.maxBudget) {
        const budget = Number(body.preferences.maxBudget);
        if (!isNaN(budget) && budget >= 10 && budget <= 10000) {
          updatedPreferences.maxBudget = Math.round(budget);
        }
      }
    }

    // Update the profile in the database
    await dynamoService.updateUserProfile(userId, {
      styleProfile: updatedStyleProfile,
      preferences: updatedPreferences,
    });

    // Generate suggestions based on feedback if provided
    let suggestions: string[] | undefined;
    if (body.feedback) {
      suggestions = await generateProfileSuggestions(
        updatedStyleProfile,
        updatedPreferences,
        body.feedback
      );
    }

    const response: ReviewProfileResponse = {
      updatedProfile: {
        styleProfile: updatedStyleProfile,
        preferences: updatedPreferences,
      },
      suggestions,
    };

    return createApiResponse(response);

  } catch (error) {
    console.error('Update profile review error:', error);
    return createErrorResponse('Failed to update profile', 500);
  }
}

async function generateProfileSuggestions(
  styleProfile: StyleProfile,
  preferences: UserPreferences,
  feedback: string
): Promise<string[]> {
  const suggestionPrompt = `
Based on this user feedback about their style profile, provide 3-5 specific suggestions for improvement:

Current Style Profile:
- Emotions: ${styleProfile.emotions.join(', ')}
- Personality: ${styleProfile.archetype.join(', ')}
- Style Essence: ${styleProfile.essence.join(', ')}
- Lifestyle: ${styleProfile.lifestyle.join(', ')}
- Values: ${styleProfile.values.join(', ')}
- Budget: $${preferences.maxBudget}
- Location: ${preferences.zipCode}

User Feedback: "${feedback}"

Available options for each category:
- Emotions: ${SCHEMA_METADATA.EMOTIONS.tags.join(', ')}
- Archetype: ${SCHEMA_METADATA.ARCHETYPE.tags.join(', ')}
- Essence: ${SCHEMA_METADATA.ESSENCE.tags.join(', ')}
- Lifestyle: ${SCHEMA_METADATA.LIFESTYLE.tags.join(', ')}
- Values: ${SCHEMA_METADATA.VALUES.tags.join(', ')}

Provide specific, actionable suggestions for refining their profile. Return as a JSON array:
["suggestion 1", "suggestion 2", "suggestion 3"]
`;

  try {
    const response = await import('@/lib/bedrock').then(module => 
      module.bedrockService.sendMessage(
        [{ role: 'user', content: suggestionPrompt }],
        'You are a professional personal stylist helping users refine their style profiles. Provide specific, actionable suggestions based on their feedback.'
      )
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error generating profile suggestions:', error);
  }

  // Fallback suggestions
  return [
    'Consider exploring additional emotion tags that resonate with how you want to feel',
    'Review your style essence choices to ensure they match your aesthetic preferences',
    'Adjust your lifestyle tags to better reflect your daily activities',
    'Refine your values to align with your shopping and style priorities'
  ];
}