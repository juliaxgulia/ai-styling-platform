import { NextResponse } from 'next/server';
import { dynamoService } from '@/lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const testUserId = 'test-user-' + Date.now();
    const testSessionId = uuidv4();
    
    console.log('Testing DynamoDB operations...');
    
    // Test 1: Create session
    const testSession = {
      PK: `USER#${testUserId}`,
      SK: `ONBOARDING#${testSessionId}`,
      conversationHistory: [],
      currentStep: 'greeting',
      extractedData: {},
      isComplete: false,
      createdAt: new Date().toISOString(),
    };
    
    await dynamoService.createOnboardingSession(testSession);
    console.log('✅ Session created');
    
    // Test 2: Update session
    await dynamoService.updateOnboardingSession(testUserId, testSessionId, {
      conversationHistory: [
        { role: 'user', content: 'Hello', timestamp: new Date().toISOString() }
      ],
      currentStep: 'emotions',
      extractedData: { test: 'value' },
      isComplete: false,
    });
    console.log('✅ Session updated');
    
    // Test 3: Retrieve session
    const retrieved = await dynamoService.getOnboardingSession(testUserId, testSessionId);
    console.log('✅ Session retrieved:', retrieved?.conversationHistory?.length, 'messages');
    
    return NextResponse.json({
      success: true,
      message: 'All DynamoDB operations successful',
      testUserId,
      testSessionId,
      retrievedMessages: retrieved?.conversationHistory?.length || 0
    });
    
  } catch (error) {
    console.error('DynamoDB test error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack
      }
    }, { status: 500 });
  }
}