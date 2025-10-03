import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { bedrockClient, BEDROCK_MODEL_ID } from '@/lib/aws-config';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { dynamoService } from '@/lib/dynamodb';
import { 
  formatErrorResponse, 
  generateRequestId, 
  AuthenticationError, 
  ValidationError, 
  PhotoAnalysisError,
  AppError,
  RetryManager 
} from '@/lib/errors';
import { AIRetryService } from '@/lib/retry-service';

// Color palette schemas based on seasonal color analysis
const COLOR_PALETTE_SCHEMAS = {
  'True Spring': {
    season: 'Spring',
    characteristics: 'Warm, clear, bright colors',
    colors: ['coral', 'peach', 'golden yellow', 'warm red', 'turquoise', 'bright green', 'ivory', 'camel']
  },
  'Light Spring': {
    season: 'Spring', 
    characteristics: 'Light, warm, delicate colors',
    colors: ['light peach', 'soft coral', 'cream', 'light golden yellow', 'aqua', 'mint green', 'buff', 'light camel']
  },
  'Deep Spring': {
    season: 'Spring',
    characteristics: 'Deep, warm, vibrant colors', 
    colors: ['bright orange', 'warm red', 'golden yellow', 'emerald green', 'teal', 'chocolate brown', 'warm navy', 'ivory']
  },
  'True Summer': {
    season: 'Summer',
    characteristics: 'Cool, soft, muted colors',
    colors: ['rose pink', 'lavender', 'powder blue', 'soft white', 'plum', 'sage green', 'cocoa', 'navy']
  },
  'Light Summer': {
    season: 'Summer',
    characteristics: 'Light, cool, soft colors',
    colors: ['baby pink', 'sky blue', 'lavender', 'soft white', 'light gray', 'mint', 'rose beige', 'periwinkle']
  },
  'Soft Summer': {
    season: 'Summer', 
    characteristics: 'Muted, cool, gentle colors',
    colors: ['dusty rose', 'sage green', 'soft teal', 'mauve', 'pewter', 'soft white', 'rose brown', 'blue gray']
  },
  'True Autumn': {
    season: 'Autumn',
    characteristics: 'Warm, rich, earthy colors',
    colors: ['rust', 'golden brown', 'olive green', 'burnt orange', 'deep gold', 'brick red', 'cream', 'chocolate']
  },
  'Soft Autumn': {
    season: 'Autumn',
    characteristics: 'Muted, warm, earthy colors', 
    colors: ['salmon', 'sage green', 'mushroom', 'soft white', 'oyster', 'stone', 'khaki', 'pewter']
  },
  'Deep Autumn': {
    season: 'Autumn',
    characteristics: 'Deep, warm, rich colors',
    colors: ['burgundy', 'forest green', 'chocolate brown', 'burnt orange', 'deep gold', 'brick red', 'cream', 'charcoal']
  },
  'True Winter': {
    season: 'Winter',
    characteristics: 'Cool, clear, contrasting colors',
    colors: ['true red', 'royal blue', 'emerald green', 'pure white', 'black', 'hot pink', 'lemon yellow', 'purple']
  },
  'Bright Winter': {
    season: 'Winter',
    characteristics: 'Bright, cool, clear colors',
    colors: ['bright red', 'electric blue', 'hot pink', 'pure white', 'black', 'bright green', 'magenta', 'royal purple']
  },
  'Deep Winter': {
    season: 'Winter',
    characteristics: 'Deep, cool, dramatic colors',
    colors: ['burgundy', 'navy', 'forest green', 'pure white', 'black', 'deep purple', 'charcoal', 'icy blue']
  }
};

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    // Authenticate user
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        formatErrorResponse(new AuthenticationError(), requestId),
        { status: 401 }
      );
    }

    let body: { imageUrl: string };
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        formatErrorResponse(new ValidationError('Invalid JSON in request body'), requestId),
        { status: 400 }
      );
    }

    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        formatErrorResponse(new ValidationError('Missing required field: imageUrl'), requestId),
        { status: 400 }
      );
    }

    // Create the analysis prompt for color palette determination
    const analysisPrompt = `You are a professional color analyst specializing in seasonal color analysis. Analyze this portrait photo to determine the person's seasonal color palette.

Please analyze the following features:
1. Skin tone (warm/cool undertones, depth, clarity)
2. Hair color (natural color, undertones, depth)
3. Eye color (hue, depth, clarity)

Based on your analysis, determine which of these 12 seasonal color palettes best suits this person:

Spring Types (Warm):
- True Spring: Warm, clear, bright colors
- Light Spring: Light, warm, delicate colors  
- Deep Spring: Deep, warm, vibrant colors

Summer Types (Cool):
- True Summer: Cool, soft, muted colors
- Light Summer: Light, cool, soft colors
- Soft Summer: Muted, cool, gentle colors

Autumn Types (Warm):
- True Autumn: Warm, rich, earthy colors
- Soft Autumn: Muted, warm, earthy colors
- Deep Autumn: Deep, warm, rich colors

Winter Types (Cool):
- True Winter: Cool, clear, contrasting colors
- Bright Winter: Bright, cool, clear colors
- Deep Winter: Deep, cool, dramatic colors

Provide your response in this exact JSON format:
{
  "colorPalette": "exact palette name from the list above",
  "skinTone": "description of skin undertones and characteristics",
  "hairColor": "description of hair color and undertones", 
  "eyeColor": "description of eye color and characteristics",
  "confidence": number between 0.0 and 1.0,
  "reasoning": "detailed explanation of why this palette was chosen"
}

Be very specific about the palette name - use exactly one of the 12 names listed above.`;

    // Use retry service for color palette analysis
    const result = await AIRetryService.retryPhotoAnalysis(async () => {
      // Call Claude 3.5 Sonnet with vision capabilities using circuit breaker
      let analysisText: string;
      try {
        analysisText = await AIRetryService.withCircuitBreaker(async () => {
          const command = new InvokeModelCommand({
            modelId: BEDROCK_MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              max_tokens: 1000,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: analysisPrompt
                    },
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: 'image/jpeg',
                        data: imageUrl.includes('base64,') ? imageUrl.split('base64,')[1] : imageUrl
                      }
                    }
                  ]
                }
              ]
            })
          });

          const response = await bedrockClient.send(command);
          const responseBody = JSON.parse(new TextDecoder().decode(response.body));
          return responseBody.content[0].text;
        }, 'bedrock-vision-color-palette');
      } catch (error) {
        throw new PhotoAnalysisError('Color palette analysis service is temporarily unavailable');
      }

      // Parse the JSON response from Claude
      let analysisResult: any;
      try {
        // Extract JSON from the response text
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new PhotoAnalysisError('AI returned invalid response format');
        }
        analysisResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse Claude response:', analysisText);
        throw new PhotoAnalysisError('Failed to parse color analysis results');
      }

      // Validate the color palette is one of our known types
      if (!COLOR_PALETTE_SCHEMAS[analysisResult.colorPalette as keyof typeof COLOR_PALETTE_SCHEMAS]) {
        console.error('Unknown color palette:', analysisResult.colorPalette);
        throw new PhotoAnalysisError('AI detected unknown color palette');
      }

      // Validate confidence score
      if (typeof analysisResult.confidence !== 'number' || analysisResult.confidence < 0 || analysisResult.confidence > 1) {
        analysisResult.confidence = 0.5; // Default confidence if invalid
      }

      return {
        ...analysisResult,
        confidence: analysisResult.confidence
      };
    }, 0.6); // Lower confidence threshold for color analysis

    if (result.success && result.data) {
      // Get the full palette information
      const paletteInfo = COLOR_PALETTE_SCHEMAS[result.data.colorPalette as keyof typeof COLOR_PALETTE_SCHEMAS];

      // Store analysis results in DynamoDB with retry
      const analysisId = `color-${Date.now()}`;
      try {
        await RetryManager.withRetry(
          () => dynamoService.createAnalysisResult({
            PK: `USER#${user.userId}`,
            SK: `ANALYSIS#${analysisId}`,
            type: 'color-palette',
            imageUrl,
            results: {
              colorPalette: {
                season: result.data!.colorPalette,
                colors: paletteInfo.colors,
                skinTone: result.data!.skinTone,
                hairColor: result.data!.hairColor,
                eyeColor: result.data!.eyeColor
              },
              confidence: result.data!.confidence
            },
            userConfirmed: false,
            createdAt: new Date().toISOString()
          }),
          { maxRetries: 3, baseDelay: 1000 }
        );
      } catch (error) {
        console.warn('Failed to store color analysis results:', error);
        // Continue with response even if storage fails
      }

      return createApiResponse({
        analysisId,
        colorPalette: {
          season: result.data.colorPalette,
          colors: paletteInfo.colors,
          characteristics: paletteInfo.characteristics,
          skinTone: result.data.skinTone,
          hairColor: result.data.hairColor,
          eyeColor: result.data.eyeColor
        },
        confidence: result.data.confidence,
        reasoning: result.data.reasoning,
        recommendations: {
          bestColors: paletteInfo.colors.slice(0, 4),
          avoidColors: getColorsToAvoid(result.data.colorPalette),
          tips: getColorTips(result.data.colorPalette)
        }
      });
    } else {
      // Handle low confidence or failed analysis
      const error = result.error!;
      
      // If we have low confidence data, include it in the response
      if (result.data && error instanceof PhotoAnalysisError) {
        const paletteInfo = COLOR_PALETTE_SCHEMAS[result.data.colorPalette as keyof typeof COLOR_PALETTE_SCHEMAS];
        
        return NextResponse.json({
          success: false,
          data: {
            analysisId: `color-${Date.now()}`,
            colorPalette: {
              season: result.data.colorPalette,
              colors: paletteInfo.colors,
              characteristics: paletteInfo.characteristics,
              skinTone: result.data.skinTone,
              hairColor: result.data.hairColor,
              eyeColor: result.data.eyeColor
            },
            confidence: result.data.confidence,
            reasoning: result.data.reasoning,
            requiresManualReview: true
          },
          error: formatErrorResponse(error, requestId).error
        }, { status: 422 });
      }

      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

  } catch (error) {
    console.error('Color palette analysis error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      formatErrorResponse(new PhotoAnalysisError('Failed to analyze color palette'), requestId),
      { status: 500 }
    );
  }
}

// Helper function to get colors to avoid based on palette
function getColorsToAvoid(palette: string): string[] {
  const avoidanceMap: Record<string, string[]> = {
    'True Spring': ['black', 'pure white', 'burgundy', 'navy'],
    'Light Spring': ['black', 'dark colors', 'heavy colors', 'burgundy'],
    'Deep Spring': ['pastels', 'muted colors', 'icy colors', 'black'],
    'True Summer': ['orange', 'bright yellow', 'warm colors', 'black'],
    'Light Summer': ['dark colors', 'bright colors', 'orange', 'gold'],
    'Soft Summer': ['bright colors', 'orange', 'black', 'pure white'],
    'True Autumn': ['icy colors', 'pastels', 'black', 'pure white'],
    'Soft Autumn': ['bright colors', 'black', 'pure white', 'neon colors'],
    'Deep Autumn': ['pastels', 'icy colors', 'light colors', 'neon colors'],
    'True Winter': ['orange', 'yellow-green', 'warm colors', 'muted colors'],
    'Bright Winter': ['muted colors', 'dusty colors', 'orange', 'yellow-green'],
    'Deep Winter': ['light colors', 'pastels', 'orange', 'yellow-green']
  };

  return avoidanceMap[palette] || ['orange', 'bright yellow'];
}

// Helper function to get styling tips based on palette
function getColorTips(palette: string): string[] {
  const tipsMap: Record<string, string[]> = {
    'True Spring': [
      'Wear colors close to your face for maximum impact',
      'Combine warm colors for a harmonious look',
      'Use coral or peach as your signature color',
      'Avoid black near your face - use warm navy instead'
    ],
    'Light Spring': [
      'Choose light, delicate colors that won\'t overpower you',
      'Layer different light warm tones together',
      'Use cream instead of pure white',
      'Add warmth with golden accessories'
    ],
    'Deep Spring': [
      'Embrace bold, vibrant colors with confidence',
      'Mix warm jewel tones for sophisticated looks',
      'Use ivory or cream instead of pure white',
      'Balance bright colors with warm neutrals'
    ],
    'True Summer': [
      'Stick to cool, soft colors that complement your gentle coloring',
      'Layer different shades of blue and pink',
      'Use soft white instead of bright white',
      'Add depth with navy or charcoal'
    ],
    'Light Summer': [
      'Choose light, cool colors with soft intensity',
      'Combine pastels for a fresh, airy look',
      'Use powder blue as a versatile neutral',
      'Avoid colors that are too dark or bright'
    ],
    'Soft Summer': [
      'Embrace muted, gentle colors that won\'t clash',
      'Mix cool tones in similar intensities',
      'Use rose beige as your perfect neutral',
      'Add interest with soft patterns and textures'
    ],
    'True Autumn': [
      'Wear rich, warm earth tones with confidence',
      'Combine different warm colors for depth',
      'Use golden brown as your signature neutral',
      'Add warmth with copper or gold accessories'
    ],
    'Soft Autumn': [
      'Choose muted, warm colors that harmonize beautifully',
      'Layer earth tones in similar intensities',
      'Use mushroom or sage as versatile neutrals',
      'Avoid colors that are too bright or cool'
    ],
    'Deep Autumn': [
      'Embrace deep, rich colors that match your intensity',
      'Mix warm jewel tones for dramatic looks',
      'Use chocolate brown as your power neutral',
      'Balance deep colors with warm metallics'
    ],
    'True Winter': [
      'Wear clear, contrasting colors with confidence',
      'Combine cool colors for striking combinations',
      'Use pure white and black as your signature neutrals',
      'Add drama with jewel-toned accessories'
    ],
    'Bright Winter': [
      'Embrace bright, clear colors that match your vibrancy',
      'Mix cool, bright colors for energetic looks',
      'Use pure white as your perfect neutral',
      'Balance bright colors with black or navy'
    ],
    'Deep Winter': [
      'Choose deep, cool colors that complement your dramatic coloring',
      'Layer dark jewel tones for sophisticated looks',
      'Use charcoal or navy as versatile neutrals',
      'Add contrast with icy accents'
    ]
  };

  return tipsMap[palette] || [
    'Wear colors that complement your natural coloring',
    'Choose colors that make you feel confident',
    'Consider the occasion when selecting colors',
    'Balance bold colors with neutrals'
  ];
}