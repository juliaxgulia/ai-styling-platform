import { NextRequest, NextResponse } from 'next/server';
import { bedrockService } from '@/lib/bedrock';
import { dynamoService } from '@/lib/dynamodb';
import { validateAuth } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { ConversationMessage } from '@/types/user';
import { v4 as uuidv4 } from 'uuid';
import { 
  formatErrorResponse, 
  generateRequestId, 
  AuthenticationError, 
  ValidationError, 
  DatabaseError, 
  ConversationError,
  AppError
} from '@/lib/errors';

interface SimpleOnboardingRequest {
  message: string;
  sessionId?: string;
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
    let body: SimpleOnboardingRequest;
    
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

    // Get or create onboarding session (SIMPLIFIED - no complex recovery)
    let sessionId = body.sessionId;
    let conversationHistory: ConversationMessage[] = [];

    if (sessionId) {
      try {
        const existingSession = await dynamoService.getOnboardingSession(userId, sessionId);
        if (existingSession) {
          conversationHistory = existingSession.conversationHistory || [];
        }
      } catch (error) {
        console.warn('Could not retrieve existing session, creating new one');
        sessionId = uuidv4();
      }
    } else {
      sessionId = uuidv4();
    }

    // Add user message
    const userMessage: ConversationMessage = {
      role: 'user',
      content: body.message.trim(),
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(userMessage);

    // Get AI response (SIMPLIFIED - basic conversation)
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const systemPrompt = `You are a friendly personal stylist AI. Have a natural conversation to learn about the user's style preferences. Ask one question at a time and be encouraging.`;
    
    const aiResponse = await bedrockService.sendMessage(messages, systemPrompt);

    // Add AI response
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(assistantMessage);

    // Save session (SIMPLIFIED - just conversation, no complex extraction)
    const sessionData = {
      PK: `USER#${userId}`,
      SK: `ONBOARDING#${sessionId}`,
      conversationHistory,
      currentStep: 'chatting',
      extractedData: {}, // Empty for now
      isComplete: false,
      createdAt: new Date().toISOString(),
    };

    try {
      // Try to get existing session first
      const existing = await dynamoService.getOnboardingSession(userId, sessionId);
      if (existing) {
        // Update existing
        await dynamoService.updateOnboardingSession(userId, sessionId, {
          conversationHistory,
          currentStep: 'chatting',
          extractedData: {},
          isComplete: false,
        });
      } else {
        // Create new
        await dynamoService.createOnboardingSession(sessionData);
      }
    } catch (error) {
      console.error('Database save error:', error);
      throw new DatabaseError('Failed to save session updates');
    }

    return createApiResponse({
      response: aiResponse,
      sessionId,
      currentStep: 'chatting',
      extractedData: {},
      isComplete: false,
    });

  } catch (error) {
    console.error('Simple onboarding error:', error);
    
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