import { NextRequest, NextResponse } from 'next/server';
import { bedrockService } from '@/lib/bedrock';
import { s3Service } from '@/lib/s3';
import { dynamoService } from '@/lib/dynamodb';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { SilhouetteTag } from '@/types/schemas';
import { BodyShapeAnalysis } from '@/types/user';
import { v4 as uuidv4 } from 'uuid';
import { 
  validateBodyShapeAnalysis, 
  requiresAdditionalPhoto,
  getBodyShapeAnalysisPrompt,
  getBodyShapeSystemPrompt,
  BodyShapeAnalysisResult
} from '@/lib/body-shape-analysis';
import { 
  formatErrorResponse, 
  generateRequestId, 
  ValidationError, 
  StorageError, 
  PhotoAnalysisError,
  AppError,
  RetryManager 
} from '@/lib/errors';
import { AIRetryService } from '@/lib/retry-service';

interface BodyShapeAnalysisRequest {
  imageUrl: string;
  userId: string;
}

interface BodyShapeAnalysisResponse {
  bodyShape: SilhouetteTag;
  confidence: number;
  reasoning: string;
  analysisId: string;
  requiresAdditionalPhoto: boolean;
}



export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    let body: BodyShapeAnalysisRequest;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        formatErrorResponse(new ValidationError('Invalid JSON in request body'), requestId),
        { status: 400 }
      );
    }

    const { imageUrl, userId } = body;

    if (!imageUrl || !userId) {
      return NextResponse.json(
        formatErrorResponse(new ValidationError('Missing required fields: imageUrl and userId'), requestId),
        { status: 400 }
      );
    }

    // Use retry service for photo analysis with confidence checking
    const result = await AIRetryService.retryPhotoAnalysis(async () => {
      // Download image from S3 with retry
      let imageBase64: string;
      try {
        imageBase64 = await RetryManager.withRetry(
          () => downloadImageAsBase64(imageUrl),
          {
            maxRetries: 3,
            baseDelay: 1000,
            shouldRetry: (error: Error) => {
              // Retry on network errors, but not on 404s
              return !error.message.includes('404') && !error.message.includes('403');
            }
          }
        );
      } catch (error) {
        throw new StorageError('Failed to download image for analysis');
      }
      
      // Analyze body shape using Claude 3.5 Sonnet vision with circuit breaker
      let analysisResult: BodyShapeAnalysisResult;
      try {
        analysisResult = await AIRetryService.withCircuitBreaker(
          () => analyzeBodyShape(imageBase64),
          'bedrock-vision-body-shape'
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('JSON') || errorMessage.includes('format')) {
          throw new PhotoAnalysisError('AI returned invalid analysis format');
        }
        throw new PhotoAnalysisError('Body shape analysis failed');
      }
      
      // Validate the analysis result
      const validationResult = validateBodyShapeAnalysis(analysisResult);
      if (!validationResult.valid) {
        throw new PhotoAnalysisError(validationResult.error!);
      }

      return analysisResult;
    }, 0.7); // Minimum confidence threshold

    // Generate unique analysis ID
    const analysisId = uuidv4();
    
    if (result.success && result.data) {
      // Store successful analysis results
      try {
        await RetryManager.withRetry(
          () => storeAnalysisResults(userId, analysisId, imageUrl, result.data!),
          { maxRetries: 3, baseDelay: 1000 }
        );
      } catch (error) {
        console.warn('Failed to store analysis results:', error);
        // Continue with response even if storage fails
      }
      
      // Determine if additional photo is needed based on confidence
      const needsAdditionalPhoto = requiresAdditionalPhoto(result.data.confidence);
      
      const response: BodyShapeAnalysisResponse = {
        bodyShape: result.data.bodyShape,
        confidence: result.data.confidence,
        reasoning: result.data.reasoning,
        analysisId,
        requiresAdditionalPhoto: needsAdditionalPhoto
      };

      return createApiResponse(response);
    } else {
      // Handle low confidence or failed analysis
      const error = result.error!;
      
      // If we have low confidence data, include it in the response
      if (result.data && error instanceof PhotoAnalysisError) {
        const response: BodyShapeAnalysisResponse = {
          bodyShape: result.data.bodyShape,
          confidence: result.data.confidence,
          reasoning: result.data.reasoning,
          analysisId,
          requiresAdditionalPhoto: true
        };

        return NextResponse.json({
          success: false,
          data: response,
          error: formatErrorResponse(error, requestId).error
        }, { status: 422 });
      }

      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

  } catch (error) {
    console.error('Body shape analysis error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      formatErrorResponse(new PhotoAnalysisError('Failed to analyze body shape'), requestId),
      { status: 500 }
    );
  }
}

async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image for analysis');
  }
}

async function analyzeBodyShape(imageBase64: string): Promise<BodyShapeAnalysisResult> {
  const systemPrompt = getBodyShapeSystemPrompt();
  const prompt = getBodyShapeAnalysisPrompt();

  try {
    const response = await bedrockService.sendMessageWithImage(imageBase64, prompt, systemPrompt);
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    try {
      const analysisResult = JSON.parse(jsonMatch[0]);
      return analysisResult;
    } catch (parseError) {
      throw new Error('Invalid JSON format in AI response');
    }
    
  } catch (error) {
    console.error('Error analyzing body shape:', error);
    throw error; // Re-throw to preserve original error type
  }
}



async function storeAnalysisResults(
  userId: string, 
  analysisId: string, 
  imageUrl: string, 
  analysis: BodyShapeAnalysisResult
): Promise<void> {
  const analysisRecord = {
    PK: `USER#${userId}`,
    SK: `ANALYSIS#${analysisId}`,
    type: 'body-shape' as const,
    imageUrl,
    results: {
      bodyShape: analysis.bodyShape,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    },
    userConfirmed: false,
    createdAt: new Date().toISOString()
  };

  await dynamoService.putItem(analysisRecord);
}