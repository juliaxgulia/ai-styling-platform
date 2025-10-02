import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { dynamoService } from '@/lib/dynamodb';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { analysisId, confirmed, adjustments } = body;

    if (!analysisId || confirmed === undefined) {
      return createErrorResponse('Missing required fields: analysisId, confirmed', 400);
    }

    // Get the existing analysis result
    const analysisResult = await dynamoService.getAnalysisResult(user.userId, analysisId);
    if (!analysisResult) {
      return createErrorResponse('Analysis result not found', 404);
    }

    // Update the analysis result with confirmation status
    const updatedResult = {
      ...analysisResult,
      userConfirmed: confirmed,
      confirmedAt: new Date().toISOString(),
      ...(adjustments && { userAdjustments: adjustments })
    };

    // Store the updated analysis result
    await dynamoService.putItem(updatedResult);

    // If confirmed, update the user's physical profile
    if (confirmed) {
      const userProfile = await dynamoService.getUserProfile(user.userId);
      if (userProfile) {
        const physicalProfileUpdates: any = {};

        if (analysisResult.type === 'body-shape') {
          physicalProfileUpdates.physicalProfile = {
            ...userProfile.physicalProfile,
            bodyShape: adjustments?.bodyShape || analysisResult.results.bodyShape,
            bodyShapeConfidence: adjustments?.confidence || analysisResult.results.confidence,
            bodyShapeAnalysisId: analysisId
          };
        } else if (analysisResult.type === 'color-palette') {
          physicalProfileUpdates.physicalProfile = {
            ...userProfile.physicalProfile,
            colorPalette: {
              season: adjustments?.season || analysisResult.results.colorPalette.season,
              colors: adjustments?.colors || analysisResult.results.colorPalette.colors,
              skinTone: adjustments?.skinTone || analysisResult.results.colorPalette.skinTone,
              hairColor: adjustments?.hairColor || analysisResult.results.colorPalette.hairColor,
              eyeColor: adjustments?.eyeColor || analysisResult.results.colorPalette.eyeColor,
              confidence: adjustments?.confidence || analysisResult.results.confidence,
              characteristics: analysisResult.results.colorPalette.characteristics
            },
            colorAnalysisId: analysisId
          };
        }

        await dynamoService.updateUserProfile(user.userId, physicalProfileUpdates);
      }
    }

    return createApiResponse({
      analysisId,
      confirmed,
      message: confirmed ? 'Analysis confirmed and profile updated' : 'Analysis confirmation recorded',
      updatedProfile: confirmed ? await dynamoService.getUserProfile(user.userId) : null
    });

  } catch (error) {
    console.error('Analysis confirmation error:', error);
    return createErrorResponse('Failed to confirm analysis', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');

    if (!analysisId) {
      return createErrorResponse('Missing required parameter: analysisId', 400);
    }

    // Get the analysis result
    const analysisResult = await dynamoService.getAnalysisResult(user.userId, analysisId);
    if (!analysisResult) {
      return createErrorResponse('Analysis result not found', 404);
    }

    // Format the response based on analysis type
    let formattedResult;
    if (analysisResult.type === 'body-shape') {
      formattedResult = {
        analysisId,
        type: 'body-shape',
        results: {
          bodyShape: analysisResult.results.bodyShape,
          confidence: analysisResult.results.confidence,
          reasoning: analysisResult.results.reasoning
        },
        userConfirmed: analysisResult.userConfirmed,
        userAdjustments: analysisResult.userAdjustments,
        createdAt: analysisResult.createdAt,
        confirmedAt: analysisResult.confirmedAt,
        adjustmentOptions: getBodyShapeAdjustmentOptions(),
        confidenceThreshold: 0.7
      };
    } else if (analysisResult.type === 'color-palette') {
      formattedResult = {
        analysisId,
        type: 'color-palette',
        results: {
          colorPalette: analysisResult.results.colorPalette,
          confidence: analysisResult.results.confidence,
          reasoning: analysisResult.results.reasoning
        },
        userConfirmed: analysisResult.userConfirmed,
        userAdjustments: analysisResult.userAdjustments,
        createdAt: analysisResult.createdAt,
        confirmedAt: analysisResult.confirmedAt,
        adjustmentOptions: getColorPaletteAdjustmentOptions(),
        confidenceThreshold: 0.7
      };
    }

    return createApiResponse(formattedResult);

  } catch (error) {
    console.error('Get analysis confirmation error:', error);
    return createErrorResponse('Failed to get analysis confirmation', 500);
  }
}

// Helper function to get body shape adjustment options
function getBodyShapeAdjustmentOptions() {
  return {
    bodyShapes: [
      { value: 'middle_balance', label: 'Apple/Middle Balance', description: 'Fuller midsection with narrower hips and shoulders' },
      { value: 'lower_balance', label: 'Pear/Lower Balance', description: 'Fuller hips and thighs with narrower shoulders' },
      { value: 'waist_balance', label: 'Hourglass/Waist Balance', description: 'Balanced shoulders and hips with defined waist' },
      { value: 'upper_balance', label: 'Inverted Triangle/Upper Balance', description: 'Broader shoulders with narrower hips' },
      { value: 'equal_balance', label: 'Rectangle/Equal Balance', description: 'Similar measurements throughout with minimal waist definition' }
    ],
    confidenceLevels: [
      { value: 0.9, label: 'Very Confident' },
      { value: 0.8, label: 'Confident' },
      { value: 0.7, label: 'Somewhat Confident' },
      { value: 0.6, label: 'Uncertain' }
    ]
  };
}

// Helper function to get color palette adjustment options
function getColorPaletteAdjustmentOptions() {
  return {
    seasons: [
      { 
        value: 'True Spring', 
        label: 'True Spring', 
        description: 'Warm, clear, bright colors',
        characteristics: 'Golden undertones, bright eyes, warm hair'
      },
      { 
        value: 'Light Spring', 
        label: 'Light Spring', 
        description: 'Light, warm, delicate colors',
        characteristics: 'Light golden undertones, soft features'
      },
      { 
        value: 'Deep Spring', 
        label: 'Deep Spring', 
        description: 'Deep, warm, vibrant colors',
        characteristics: 'Rich golden undertones, intense coloring'
      },
      { 
        value: 'True Summer', 
        label: 'True Summer', 
        description: 'Cool, soft, muted colors',
        characteristics: 'Cool undertones, soft features, muted coloring'
      },
      { 
        value: 'Light Summer', 
        label: 'Light Summer', 
        description: 'Light, cool, soft colors',
        characteristics: 'Light cool undertones, delicate features'
      },
      { 
        value: 'Soft Summer', 
        label: 'Soft Summer', 
        description: 'Muted, cool, gentle colors',
        characteristics: 'Soft cool undertones, gentle contrast'
      },
      { 
        value: 'True Autumn', 
        label: 'True Autumn', 
        description: 'Warm, rich, earthy colors',
        characteristics: 'Rich warm undertones, earthy coloring'
      },
      { 
        value: 'Soft Autumn', 
        label: 'Soft Autumn', 
        description: 'Muted, warm, earthy colors',
        characteristics: 'Soft warm undertones, muted intensity'
      },
      { 
        value: 'Deep Autumn', 
        label: 'Deep Autumn', 
        description: 'Deep, warm, rich colors',
        characteristics: 'Deep warm undertones, rich intensity'
      },
      { 
        value: 'True Winter', 
        label: 'True Winter', 
        description: 'Cool, clear, contrasting colors',
        characteristics: 'Cool undertones, high contrast, clear features'
      },
      { 
        value: 'Bright Winter', 
        label: 'Bright Winter', 
        description: 'Bright, cool, clear colors',
        characteristics: 'Cool undertones, bright intensity, clear eyes'
      },
      { 
        value: 'Deep Winter', 
        label: 'Deep Winter', 
        description: 'Deep, cool, dramatic colors',
        characteristics: 'Deep cool undertones, dramatic contrast'
      }
    ],
    confidenceLevels: [
      { value: 0.9, label: 'Very Confident' },
      { value: 0.8, label: 'Confident' },
      { value: 0.7, label: 'Somewhat Confident' },
      { value: 0.6, label: 'Uncertain' }
    ]
  };
}