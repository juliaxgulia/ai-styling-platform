import { NextRequest, NextResponse } from 'next/server';
import { dynamoService } from '@/lib/dynamodb';

export async function GET(request: NextRequest) {
  try {
    // Test basic DynamoDB connection
    const testUserId = 'test-user-' + Date.now();
    const testSessionId = 'test-session-' + Date.now();
    
    // Try to create a test onboarding session
    const testSession = {
      PK: `USER#${testUserId}`,
      SK: `ONBOARDING#${testSessionId}`,
      conversationHistory: [],
      currentStep: 'greeting',
      extractedData: {},
      isComplete: false,
      createdAt: new Date().toISOString(),
    };

    console.log('Testing DynamoDB with table:', process.env.DYNAMODB_TABLE_NAME || 'ai-styling-platform-prod');
    
    await dynamoService.createOnboardingSession(testSession);
    
    // Try to retrieve it
    const retrieved = await dynamoService.getOnboardingSession(testUserId, testSessionId);
    
    // Test the update operation that's failing
    const updateData = {
      conversationHistory: [
        { role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: 'Hi there!', timestamp: new Date().toISOString() }
      ],
      extractedData: { emotions: ['Confident'] },
      currentStep: 'emotions',
      isComplete: false,
    };
    
    await dynamoService.updateOnboardingSession(testUserId, testSessionId, updateData);
    
    // Retrieve again to verify update worked
    const updatedSession = await dynamoService.getOnboardingSession(testUserId, testSessionId);
    
    return NextResponse.json({
      success: true,
      message: 'DynamoDB connection working',
      tableName: process.env.DYNAMODB_TABLE_NAME || 'ai-styling-platform-prod',
      testData: {
        created: testSession,
        retrieved: retrieved,
        updated: updatedSession
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('DynamoDB test error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack
      },
      tableName: process.env.DYNAMODB_TABLE_NAME || 'ai-styling-platform-prod',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}