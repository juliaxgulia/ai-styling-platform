import { NextRequest, NextResponse } from 'next/server';
import { bedrockService } from '@/lib/bedrock';

export async function GET(request: NextRequest) {
  try {
    // Simple test message
    const testMessages = [
      { role: 'user' as const, content: 'Hello, can you respond with just "Test successful"?' }
    ];

    const response = await bedrockService.sendMessage(testMessages);
    
    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Bedrock test error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}