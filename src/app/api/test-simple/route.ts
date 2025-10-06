import { NextResponse } from 'next/server';
import { dynamoService } from '@/lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    console.log('Starting simple DynamoDB test...');
    
    const testUserId = 'simple-test-' + Date.now();
    const testSessionId = uuidv4();
    
    // Test session creation
    const testSession = {
      PK: `USER#${testUserId}`,
      SK: `ONBOARDING#${testSessionId}`,
      conversationHistory: [
        { role: 'user' as const, content: 'Test message', timestamp: new Date().toISOString() }
      ],
      currentStep: 'greeting',
      extractedData: {},
      isComplete: false,
      createdAt: new Date().toISOString(),
    };
    
    console.log('Creating session...');
    await dynamoService.createOnboardingSession(testSession);
    console.log('Session created successfully');
    
    // Test session update
    console.log('Updating session...');
    await dynamoService.updateOnboardingSession(testUserId, testSessionId, {
      conversationHistory: [
        { role: 'user' as const, content: 'Test message', timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: 'Test response', timestamp: new Date().toISOString() }
      ],
      currentStep: 'emotions',
      extractedData: {
        emotions: ['Confident'],
        archetype: [],
        essence: [],
        lifestyle: [],
        values: []
      },
      isComplete: false,
    });
    console.log('Session updated successfully');
    
    // Test session retrieval
    console.log('Retrieving session...');
    const retrieved = await dynamoService.getOnboardingSession(testUserId, testSessionId);
    console.log('Session retrieved successfully');
    
    return NextResponse.json({
      success: true,
      message: 'All operations completed successfully',
      testData: {
        userId: testUserId,
        sessionId: testSessionId,
        messageCount: retrieved?.conversationHistory?.length || 0,
        currentStep: retrieved?.currentStep,
        hasExtractedData: Object.keys(retrieved?.extractedData || {}).length > 0
      }
    });
    
  } catch (error) {
    console.error('Simple test error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      }
    }, { status: 500 });
  }
}