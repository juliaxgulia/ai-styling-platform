import { NextRequest, NextResponse } from 'next/server';
import { bedrockService } from '@/lib/bedrock';
import { dynamoService } from '@/lib/dynamodb';
import { validateAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  
  try {
    logs.push('1. Starting onboarding debug');
    
    // Test authentication
    logs.push('2. Testing authentication...');
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      logs.push('2. AUTH FAILED: ' + authResult.error);
      return NextResponse.json({ success: false, error: 'Authentication failed', logs });
    }
    logs.push('2. AUTH SUCCESS: User ID = ' + authResult.user.id);
    
    const userId = authResult.user.id;
    
    // Test user profile exists
    logs.push('3. Checking user profile...');
    const userProfile = await dynamoService.getUserProfile(userId);
    if (!userProfile) {
      logs.push('3. USER PROFILE NOT FOUND');
      return NextResponse.json({ success: false, error: 'User profile not found', logs });
    }
    logs.push('3. USER PROFILE EXISTS: ' + userProfile.email);
    
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