import { NextRequest } from 'next/server';
import { dynamoService } from '@/lib/dynamodb';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateUserPreferences } from '@/lib/validation';

// GET /api/users/profile/preferences - Get user preferences
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const userProfile = await dynamoService.getUserProfile(user.userId);
    
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    return createApiResponse({
      preferences: userProfile.preferences
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

// PUT /api/users/profile/preferences - Update user preferences
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { preferences } = await request.json();

    if (!preferences) {
      return createErrorResponse('Preferences data is required', 400);
    }

    // Validate preferences
    const validation = validateUserPreferences(preferences);
    if (!validation.valid) {
      return createErrorResponse(`Validation errors: ${validation.errors.join(', ')}`, 400);
    }

    // Update preferences
    await dynamoService.updateUserProfile(user.userId, { preferences });

    return createApiResponse({
      message: 'Preferences updated successfully',
      preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});