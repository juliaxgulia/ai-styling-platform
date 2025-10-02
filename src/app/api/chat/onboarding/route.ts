import { NextRequest, NextResponse } from 'next/server';
import { bedrockService } from '@/lib/bedrock';
import { dynamoService } from '@/lib/dynamodb';
import { validateAuth } from '@/lib/auth';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { schemaExtractionService } from '@/lib/schema-extraction';
import { OnboardingSession, ConversationMessage, ExtractedData } from '@/types/user';
import { SCHEMA_METADATA } from '@/types/schemas';
import { v4 as uuidv4 } from 'uuid';
import { 
  formatErrorResponse, 
  generateRequestId, 
  AuthenticationError, 
  ValidationError, 
  NotFoundError, 
  DatabaseError, 
  ConversationError, 
  SessionExpiredError,
  AppError 
} from '@/lib/errors';
import { AIRetryService, SessionRecoveryManager } from '@/lib/retry-service';

interface OnboardingChatRequest {
  message: string;
  sessionId?: string;
}

interface OnboardingChatResponse {
  response: string;
  sessionId: string;
  currentStep: string;
  extractedData: ExtractedData;
  isComplete: boolean;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        formatErrorResponse(new AuthenticationError(), requestId),
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    let body: OnboardingChatRequest;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        formatErrorResponse(new ValidationError('Invalid JSON in request body'), requestId),
        { status: 400 }
      );
    }
    
    if (!body.message?.trim()) {
      return NextResponse.json(
        formatErrorResponse(new ValidationError('Message is required'), requestId),
        { status: 400 }
      );
    }

    // Use retry service for the entire conversation operation
    const result = await AIRetryService.retryConversation(async () => {
      // Get or create onboarding session with session recovery
      let session: OnboardingSession;
      let sessionId = body.sessionId;

      if (sessionId) {
        try {
          const existingSession = await dynamoService.getOnboardingSession(userId, sessionId);
          if (!existingSession) {
            // Try to recover from local storage
            const recoveryData = await SessionRecoveryManager.getRecoveryData(userId, 'onboarding');
            if (recoveryData && recoveryData.sessionId === sessionId) {
              throw new SessionExpiredError('onboarding session');
            }
            throw new NotFoundError('Session');
          }
          session = existingSession;
        } catch (error) {
          if (error instanceof SessionExpiredError) {
            throw error;
          }
          throw new DatabaseError('Failed to retrieve session');
        }
      } else {
        // Create new session
        sessionId = uuidv4();
        const newSession = {
          PK: `USER#${userId}`,
          SK: `ONBOARDING#${sessionId}`,
          conversationHistory: [],
          currentStep: 'greeting',
          extractedData: {},
          isComplete: false,
          createdAt: new Date().toISOString(),
        };
        
        try {
          await dynamoService.createOnboardingSession(newSession);
          session = newSession;
        } catch (error) {
          throw new DatabaseError('Failed to create session');
        }
      }

      // Save session recovery data
      await SessionRecoveryManager.saveRecoveryData({
        sessionId: sessionId!,
        userId,
        sessionType: 'onboarding',
        lastActivity: new Date().toISOString(),
        recoveryData: {
          extractedData: session.extractedData,
          currentStep: session.currentStep
        }
      });

      // Add user message to conversation history
      const userMessage: ConversationMessage = {
        role: 'user',
        content: body.message.trim(),
        timestamp: new Date().toISOString(),
      };

      session.conversationHistory.push(userMessage);

      // Prepare conversation for AI with circuit breaker
      const messages = session.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Generate AI response with retry and circuit breaker
      let aiResponse: string;
      try {
        const systemPrompt = generateOnboardingSystemPrompt(session.extractedData);
        aiResponse = await AIRetryService.withCircuitBreaker(
          () => bedrockService.sendMessage(messages, systemPrompt),
          'bedrock-conversation'
        );
      } catch (error) {
        throw new ConversationError('AI conversation service is temporarily unavailable');
      }

      // Add AI response to conversation history
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      session.conversationHistory.push(assistantMessage);

      // Extract style preferences with retry
      let extractedPreferences: ExtractedData;
      try {
        extractedPreferences = await AIRetryService.withCircuitBreaker(
          () => schemaExtractionService.extractAllPreferences(
            session.conversationHistory,
            session.extractedData
          ),
          'schema-extraction'
        );
      } catch (error) {
        // Fallback to existing data if extraction fails
        console.warn('Schema extraction failed, using existing data:', error);
        extractedPreferences = session.extractedData;
      }
      
      // Merge with existing data, preserving existing values and avoiding duplicates
      const updatedExtractedData: ExtractedData = {
        emotions: [...new Set([...(session.extractedData.emotions || []), ...(extractedPreferences.emotions || [])])],
        archetype: [...new Set([...(session.extractedData.archetype || []), ...(extractedPreferences.archetype || [])])],
        essence: [...new Set([...(session.extractedData.essence || []), ...(extractedPreferences.essence || [])])],
        lifestyle: [...new Set([...(session.extractedData.lifestyle || []), ...(extractedPreferences.lifestyle || [])])],
        values: [...new Set([...(session.extractedData.values || []), ...(extractedPreferences.values || [])])],
        zipCode: extractedPreferences.zipCode || session.extractedData.zipCode,
        maxBudget: extractedPreferences.maxBudget || session.extractedData.maxBudget,
      };

      // Update session state
      const updatedStep = determineCurrentStep(updatedExtractedData);
      const isComplete = checkOnboardingComplete(updatedExtractedData);

      session.extractedData = updatedExtractedData;
      session.currentStep = updatedStep;
      session.isComplete = isComplete;

      // Save updated session with retry
      try {
        await dynamoService.updateOnboardingSession(userId, sessionId!, {
          conversationHistory: session.conversationHistory,
          extractedData: session.extractedData,
          currentStep: session.currentStep,
          isComplete: session.isComplete,
        });
      } catch (error) {
        throw new DatabaseError('Failed to save session updates');
      }

      // Clear recovery data if session is complete
      if (isComplete) {
        await SessionRecoveryManager.clearRecoveryData(userId, 'onboarding');
      }

      return {
        response: aiResponse,
        sessionId: sessionId!,
        currentStep: updatedStep,
        extractedData: updatedExtractedData,
        isComplete,
      };
    });

    if (result.success) {
      return createApiResponse(result.data);
    } else {
      return NextResponse.json(
        formatErrorResponse(result.error!, requestId),
        { status: result.error!.statusCode }
      );
    }

  } catch (error) {
    console.error('Onboarding chat error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        formatErrorResponse(error, requestId),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      formatErrorResponse(new ConversationError('Failed to process chat message'), requestId),
      { status: 500 }
    );
  }
}

function generateOnboardingSystemPrompt(extractedData: ExtractedData): string {
  const basePrompt = bedrockService.getOnboardingSystemPrompt();
  
  // Add context about what we've already collected
  let contextPrompt = basePrompt + '\n\n';
  
  const collectedAreas: string[] = [];
  if (extractedData.emotions?.length) collectedAreas.push('emotions');
  if (extractedData.archetype?.length) collectedAreas.push('personality archetype');
  if (extractedData.essence?.length) collectedAreas.push('style essence');
  if (extractedData.lifestyle?.length) collectedAreas.push('lifestyle');
  if (extractedData.values?.length) collectedAreas.push('values');
  if (extractedData.zipCode) collectedAreas.push('location');
  if (extractedData.maxBudget) collectedAreas.push('budget');

  if (collectedAreas.length > 0) {
    contextPrompt += `You have already collected information about: ${collectedAreas.join(', ')}. `;
  }

  const missingAreas: string[] = [];
  if (!extractedData.emotions?.length) missingAreas.push('emotions (how they want to feel)');
  if (!extractedData.archetype?.length) missingAreas.push('personality archetype');
  if (!extractedData.essence?.length) missingAreas.push('style essence');
  if (!extractedData.lifestyle?.length) missingAreas.push('lifestyle patterns');
  if (!extractedData.values?.length) missingAreas.push('style values');
  if (!extractedData.zipCode) missingAreas.push('zip code for climate');
  if (!extractedData.maxBudget) missingAreas.push('budget preferences');

  if (missingAreas.length > 0) {
    contextPrompt += `Still need to explore: ${missingAreas.join(', ')}. `;
  }

  contextPrompt += '\n\nAvailable schema tags for reference:\n';
  Object.entries(SCHEMA_METADATA).forEach(([key, schema]) => {
    if (key !== 'SILHOUETTE' && key !== 'COLOR_PALETTE') {
      contextPrompt += `${schema.name}: ${schema.examples.join(', ')}\n`;
    }
  });

  contextPrompt += '\nFocus on one area at a time and ask engaging follow-up questions to understand their preferences deeply.';

  return contextPrompt;
}



function determineCurrentStep(extractedData: ExtractedData): string {
  if (!extractedData.emotions?.length) return 'emotions';
  if (!extractedData.archetype?.length) return 'archetype';
  if (!extractedData.essence?.length) return 'essence';
  if (!extractedData.lifestyle?.length) return 'lifestyle';
  if (!extractedData.values?.length) return 'values';
  if (!extractedData.zipCode) return 'location';
  if (!extractedData.maxBudget) return 'budget';
  return 'complete';
}

function checkOnboardingComplete(extractedData: ExtractedData): boolean {
  return !!(
    extractedData.emotions?.length &&
    extractedData.archetype?.length &&
    extractedData.essence?.length &&
    extractedData.lifestyle?.length &&
    extractedData.values?.length &&
    extractedData.zipCode &&
    extractedData.maxBudget
  );
}