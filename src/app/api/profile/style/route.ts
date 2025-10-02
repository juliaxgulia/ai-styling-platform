import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { dynamoService } from '@/lib/dynamodb';
import { validateStyleProfile } from '@/lib/validation';
import { StyleProfile } from '@/types/user';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Get user profile from database
    const userProfile = await dynamoService.getUserProfile(user.userId);
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    // Return style profile data
    return createApiResponse({
      styleProfile: userProfile.styleProfile,
      lastUpdated: userProfile.createdAt
    });

  } catch (error) {
    console.error('Get style profile error:', error);
    return createErrorResponse('Failed to get style profile', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { styleProfile } = body;

    if (!styleProfile) {
      return createErrorResponse('Missing required field: styleProfile', 400);
    }

    // Validate style profile data
    const validation = validateStyleProfile(styleProfile);
    if (!validation.isValid) {
      return createErrorResponse('Invalid style profile data', 400, {
        validationErrors: validation.errors
      });
    }

    // Get existing user profile
    const existingProfile = await dynamoService.getUserProfile(user.userId);
    if (!existingProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    // Update style profile
    const updatedProfile = {
      ...existingProfile,
      styleProfile: {
        emotions: validation.validData.emotions || [],
        archetype: validation.validData.archetype || [],
        essence: validation.validData.essence || [],
        lifestyle: validation.validData.lifestyle || [],
        values: validation.validData.values || []
      },
      updatedAt: new Date().toISOString()
    };

    await dynamoService.updateUserProfile(user.userId, updatedProfile);

    return createApiResponse({
      message: 'Style profile updated successfully',
      styleProfile: updatedProfile.styleProfile
    });

  } catch (error) {
    console.error('Update style profile error:', error);
    return createErrorResponse('Failed to update style profile', 500);
  }
}