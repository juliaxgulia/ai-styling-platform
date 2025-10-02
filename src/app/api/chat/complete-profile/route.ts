import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { schemaExtractionService } from '@/lib/schema-extraction';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { StyleProfile, UserPreferences } from '@/types/user';

interface CompleteProfileRequest {
  sessionId: string;
}

interface CompleteProfileResponse {
  profile: {
    styleProfile: StyleProfile;
    preferences: UserPreferences;
  };
  summary: string;
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return createErrorResponse('Unauthorized', 401);
    }

    const userId = authResult.user.id;
    const body: CompleteProfileRequest = await request.json();
    
    if (!body.sessionId) {
      return createErrorResponse('Session ID is required', 400);
    }

    // Get the onboarding session
    const session = await dynamoService.getOnboardingSession(userId, body.sessionId);
    if (!session) {
      return createErrorResponse('Onboarding session not found', 404);
    }

    if (!session.isComplete) {
      return createErrorResponse('Onboarding session is not complete', 400);
    }

    // Extract final preferences from the complete conversation
    const finalExtraction = await schemaExtractionService.extractAllPreferences(
      session.conversationHistory,
      session.extractedData
    );

    // Validate that we have all required data
    if (!finalExtraction.emotions?.length || 
        !finalExtraction.archetype?.length || 
        !finalExtraction.essence?.length || 
        !finalExtraction.lifestyle?.length || 
        !finalExtraction.values?.length ||
        !finalExtraction.zipCode ||
        !finalExtraction.maxBudget) {
      return createErrorResponse('Incomplete profile data. Please complete the onboarding conversation.', 400);
    }

    // Create the style profile
    const styleProfile: StyleProfile = {
      emotions: finalExtraction.emotions,
      archetype: finalExtraction.archetype,
      essence: finalExtraction.essence,
      lifestyle: finalExtraction.lifestyle,
      values: finalExtraction.values,
    };

    const preferences: UserPreferences = {
      zipCode: finalExtraction.zipCode,
      maxBudget: finalExtraction.maxBudget,
    };

    // Update the user's profile in the database
    const existingProfile = await dynamoService.getUserProfile(userId);
    if (existingProfile) {
      await dynamoService.updateUserProfile(userId, {
        styleProfile,
        preferences,
      });
    } else {
      return createErrorResponse('User profile not found', 404);
    }

    // Generate a profile summary and recommendations
    const { summary, recommendations } = await generateProfileSummary(
      styleProfile,
      preferences,
      session.conversationHistory
    );

    const response: CompleteProfileResponse = {
      profile: {
        styleProfile,
        preferences,
      },
      summary,
      recommendations,
    };

    return createApiResponse(response);

  } catch (error) {
    console.error('Complete profile error:', error);
    return createErrorResponse('Failed to complete profile', 500);
  }
}

async function generateProfileSummary(
  styleProfile: StyleProfile,
  preferences: UserPreferences,
  conversationHistory: any[]
): Promise<{ summary: string; recommendations: string[] }> {
  const profileData = {
    emotions: styleProfile.emotions.join(', '),
    archetype: styleProfile.archetype.join(', '),
    essence: styleProfile.essence.join(', '),
    lifestyle: styleProfile.lifestyle.join(', '),
    values: styleProfile.values.join(', '),
    budget: `$${preferences.maxBudget}`,
    location: preferences.zipCode,
  };

  const summaryPrompt = `
Based on this style profile, create a personalized summary and recommendations:

Style Profile:
- Emotions: ${profileData.emotions}
- Personality: ${profileData.archetype}
- Style Essence: ${profileData.essence}
- Lifestyle: ${profileData.lifestyle}
- Values: ${profileData.values}
- Budget: ${profileData.budget} per month
- Location: ${profileData.location}

Create:
1. A warm, personalized summary (2-3 sentences) that captures their unique style identity
2. 5 specific, actionable style recommendations based on their profile

Return in this JSON format:
{
  "summary": "Your personalized style summary here...",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3",
    "Specific recommendation 4",
    "Specific recommendation 5"
  ]
}
`;

  try {
    const response = await import('@/lib/bedrock').then(module => 
      module.bedrockService.sendMessage(
        [{ role: 'user', content: summaryPrompt }],
        'You are a professional personal stylist creating personalized style profiles. Be warm, encouraging, and specific in your recommendations.'
      )
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Your unique style profile has been created based on your preferences.',
        recommendations: parsed.recommendations || [
          'Invest in quality basics that align with your values',
          'Choose pieces that make you feel confident and comfortable',
          'Build a capsule wardrobe within your budget',
          'Focus on your preferred style essence',
          'Consider your lifestyle needs when shopping'
        ]
      };
    }
  } catch (error) {
    console.error('Error generating profile summary:', error);
  }

  // Fallback summary and recommendations
  return {
    summary: `Your style profile reflects someone who values ${styleProfile.values.join(' and ').toLowerCase()} and wants to feel ${styleProfile.emotions.join(' and ').toLowerCase()}. Your ${styleProfile.essence.join(' and ').toLowerCase()} aesthetic perfectly matches your ${styleProfile.lifestyle.join(' and ').toLowerCase()} lifestyle.`,
    recommendations: [
      `Focus on ${styleProfile.essence[0].toLowerCase()} pieces that make you feel ${styleProfile.emotions[0].toLowerCase()}`,
      `Invest in quality items that align with your ${styleProfile.values[0].toLowerCase()} values`,
      `Build a wardrobe that supports your ${styleProfile.lifestyle[0].toLowerCase()} lifestyle`,
      `Stay within your $${preferences.maxBudget} monthly budget by prioritizing versatile pieces`,
      `Consider your local climate when building your seasonal wardrobe`
    ]
  };
}