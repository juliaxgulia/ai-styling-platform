import { NextRequest } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';

// GET /api/auth/me - Get current authenticated user
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const userProfile = await dynamoService.getUserProfile(user.userId);
    
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    return createApiResponse({
      user: {
        id: user.userId,
        email: user.email,
        createdAt: userProfile.createdAt,
        hasCompletedOnboarding: !!(
          userProfile.styleProfile.emotions.length > 0 ||
          userProfile.styleProfile.archetype.length > 0 ||
          userProfile.styleProfile.essence.length > 0 ||
          userProfile.styleProfile.lifestyle.length > 0 ||
          userProfile.styleProfile.values.length > 0
        ),
        hasPhysicalProfile: !!userProfile.physicalProfile
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});