import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { dynamoService } from '@/lib/dynamodb';
import { validatePhysicalProfile } from '@/lib/validation';
import { PhysicalProfile } from '@/types/user';

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

    // Return physical profile data
    return createApiResponse({
      physicalProfile: userProfile.physicalProfile || null,
      analysisPhotos: userProfile.analysisPhotos || null,
      lastUpdated: userProfile.createdAt
    });

  } catch (error) {
    console.error('Get physical profile error:', error);
    return createErrorResponse('Failed to get physical profile', 500);
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
    const { physicalProfile, analysisPhotos } = body;

    // Validate physical profile data if provided
    if (physicalProfile) {
      const validation = validatePhysicalProfile(physicalProfile);
      if (!validation.valid) {
        return createErrorResponse('Invalid physical profile data', 400, 'VALIDATION_ERROR');
      }
    }

    // Get existing user profile
    const existingProfile = await dynamoService.getUserProfile(user.userId);
    if (!existingProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    // Prepare updates
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (physicalProfile) {
      updates.physicalProfile = {
        ...existingProfile.physicalProfile,
        ...physicalProfile
      };
    }

    if (analysisPhotos) {
      updates.analysisPhotos = {
        ...existingProfile.analysisPhotos,
        ...analysisPhotos
      };
    }

    await dynamoService.updateUserProfile(user.userId, updates);

    return createApiResponse({
      message: 'Physical profile updated successfully',
      physicalProfile: updates.physicalProfile || existingProfile.physicalProfile,
      analysisPhotos: updates.analysisPhotos || existingProfile.analysisPhotos
    });

  } catch (error) {
    console.error('Update physical profile error:', error);
    return createErrorResponse('Failed to update physical profile', 500);
  }
}