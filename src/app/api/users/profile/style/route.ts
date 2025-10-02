import { NextRequest } from 'next/server';
import { dynamoService } from '@/lib/dynamodb';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateStyleProfile } from '@/lib/validation';

// GET /api/users/profile/style - Get style profile
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const userProfile = await dynamoService.getUserProfile(user.userId);
    
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    return createApiResponse({
      styleProfile: userProfile.styleProfile
    });

  } catch (error) {
    console.error('Get style profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

// PUT /api/users/profile/style - Update style profile
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { styleProfile } = await request.json();

    if (!styleProfile) {
      return createErrorResponse('Style profile data is required', 400);
    }

    // Validate style profile
    const validation = validateStyleProfile(styleProfile);
    if (!validation.valid) {
      return createErrorResponse(`Validation errors: ${validation.errors.join(', ')}`, 400);
    }

    // Update style profile
    await dynamoService.updateUserProfile(user.userId, { styleProfile });

    return createApiResponse({
      message: 'Style profile updated successfully',
      styleProfile
    });

  } catch (error) {
    console.error('Update style profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});