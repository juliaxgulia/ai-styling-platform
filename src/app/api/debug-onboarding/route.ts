import { NextRequest, NextResponse } from 'next/server';
import { bedrockService } from '@/lib/bedrock';
import { dynamoService } from '@/lib/dynamodb';
import { validateAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

async function runDebugTests(request?: NextRequest) {
  const logs: string[] = [];
  
  try {
    logs.push('1. Starting onboarding debug');
    
    // Test authentication (skip if no request provided)
    let userId = 'debug-test-user';
    if (request) {
      logs.push('2. Testing authentication...');
      const authResult = await validateAuth(request);
      if (!authResult.success) {
        logs.push('2. AUTH FAILED: ' + authResult.error);
        return NextResponse.json({ success: false, error: 'Authentication failed', logs });
      }
      logs.push('2. AUTH SUCCESS: User ID = ' + authResult.user.id);
      userId = authResult.user.id;
    } else {
      logs.push('2. SKIPPING AUTH (GET request)');
    }
    
    // Test user profile exists (skip for test user)
    logs.push('3. Checking user profile...');
    if (userId !== 'debug-test-user') {
      const userProfile = await dynamoService.getUserProfile(userId);
      if (!userProfile) {
        logs.push('3. USER PROFILE NOT FOUND');
        return NextResponse.json({ success: false, error: 'User profile not found', logs });
      }
      logs.push('3. USER PROFILE EXISTS: ' + userProfile.email);
    } else {
      logs.push('3. SKIPPING USER PROFILE CHECK (test user)');
    }
    
    // Test session creation
    logs.push('4. Testing session creation...');
    const sessionId = uuidv4();
    const testSession = {
      PK: `USER#${userId}`,
      SK: `ONBOARDING#${sessionId}`,
      conversationHistory: [],
      currentStep: 'greeting',
      extractedData: {},
      isComplete: false,
      createdAt: new Date().toISOString(),
    };
    
    await dynamoService.createOnboardingSession(testSession);
    logs.push('4. SESSION CREATED SUCCESSFULLY');
    
    // Test session retrieval
    logs.push('5. Testing session retrieval...');
    const retrievedSession = await dynamoService.getOnboardingSession(userId, sessionId);
    if (!retrievedSession) {
      logs.push('5. SESSION RETRIEVAL FAILED');
      return NextResponse.json({ success: false, error: 'Session retrieval failed', logs });
    }
    logs.push('5. SESSION RETRIEVED SUCCESSFULLY');
    
    // Test AI service
    logs.push('6. Testing AI service...');
    const testMessages = [{ role: 'user' as const, content: 'Hello' }];
    const aiResponse = await bedrockService.sendMessage(testMessages);
    logs.push('6. AI RESPONSE: ' + aiResponse.substring(0, 50) + '...');
    
    // Test session update
    logs.push('7. Testing session update...');
    const updateData = {
      conversationHistory: [
        { role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: aiResponse, timestamp: new Date().toISOString() }
      ],
      currentStep: 'emotions',
      extractedData: {},
      isComplete: false,
    };
    
    await dynamoService.updateOnboardingSession(userId, sessionId, updateData);
    logs.push('7. SESSION UPDATE SUCCESSFUL');
    
    // Final verification
    logs.push('8. Final verification...');
    const finalSession = await dynamoService.getOnboardingSession(userId, sessionId);
    logs.push('8. FINAL SESSION HAS ' + finalSession?.conversationHistory.length + ' messages');
    
    return NextResponse.json({
      success: true,
      message: 'All operations successful',
      logs,
      sessionData: finalSession
    });
    
  } catch (error) {
    logs.push('ERROR: ' + (error as Error).message);
    logs.push('STACK: ' + (error as Error).stack);
    
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      logs,
      errorDetails: {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      }
    }, { status: 500 });
  }
}

// Export both GET and POST methods
export async function GET() {
  return runDebugTests();
}

export async function POST(request: NextRequest) {
  return runDebugTests(request);
}