import { NextRequest, NextResponse } from 'next/server';
import { bedrockService } from '@/lib/bedrock';
import { dynamoService } from '@/lib/dynamodb';
import { ConversationMessage } from '@/types/user';
import { v4 as uuidv4 } from 'uuid';

interface TestOnboardingRequest {
  message: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestOnboardingRequest = await request.json();
    
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use a test user ID (no authentication required)
    const userId = 'test-user-' + Date.now();
    let sessionId = body.sessionId || uuidv4();
    
    // Get or create session
    let conversationHistory: ConversationMessage[] = [];
    
    if (body.sessionId) {
      const existingSession = await dynamoService.getOnboardingSession(userId, sessionId);
      if (existingSession) {
        conversationHistory = existingSession.conversationHistory || [];
      }
    }

    // Add user message
    const userMessage: ConversationMessage = {
      role: 'user',
      content: body.message.trim(),
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(userMessage);

    // Get AI response
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

    // Save session
    const sessionData = {
      PK: `USER#${userId}`,
      SK: `ONBOARDING#${sessionId}`,
      conversationHistory,
      currentStep: 'chatting',
      extractedData: {
        emotions: [],
        archetype: [],
        essence: [],
        lifestyle: [],
        values: []
      },
      isComplete: false,
      createdAt: new Date().toISOString(),
    };

    // Create or update session
    const existing = await dynamoService.getOnboardingSession(userId, sessionId);
    if (existing) {
      await dynamoService.updateOnboardingSession(userId, sessionId, {
        conversationHistory,
        currentStep: 'chatting',
        extractedData: {
          emotions: [],
          archetype: [],
          essence: [],
          lifestyle: [],
          values: []
        },
        isComplete: false,
      });
    } else {
      await dynamoService.createOnboardingSession(sessionData);
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId,
      userId,
      messageCount: conversationHistory.length
    });

  } catch (error) {
    console.error('Test onboarding error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: (error as Error).message,
        name: (error as Error).name
      }
    }, { status: 500 });
  }
}