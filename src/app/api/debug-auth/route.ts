import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';

export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH DEBUG START ===');
    
    // Check if auth token exists
    const token = request.cookies.get('auth-token')?.value;
    console.log('1. Auth token exists:', !!token);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        step: 'token_check',
        error: 'No auth token found in cookies',
        cookies: Object.fromEntries(request.cookies.entries())
      });
    }
    
    // Test full auth validation
    console.log('2. Testing validateAuth...');
    const authResult = await validateAuth(request);
    console.log('3. Auth result:', authResult);
    
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        step: 'auth_validation',
        error: authResult.error,
        hasToken: !!token
      });
    }
    
    // Test user profile lookup
    console.log('4. Testing user profile lookup...');
    const userProfile = await dynamoService.getUserProfile(authResult.user.id);
    console.log('5. User profile found:', !!userProfile);
    
    if (!userProfile) {
      return NextResponse.json({
        success: false,
        step: 'profile_lookup',
        error: 'User profile not found in DynamoDB',
        userId: authResult.user.id
      });
    }
    
    console.log('6. All auth checks passed');
    
    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email
      },
      profile: {
        email: userProfile.email,
        createdAt: userProfile.createdAt,
        hasStyleProfile: !!userProfile.styleProfile,
        hasPreferences: !!userProfile.preferences
      }
    });
    
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({
      success: false,
      step: 'exception',
      error: {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack
      }
    }, { status: 500 });
  }
}