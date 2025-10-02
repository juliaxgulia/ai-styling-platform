import { NextRequest } from 'next/server';
import { dynamoService } from '@/lib/dynamodb';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validatePhysicalProfile } from '@/lib/validation';

// GET /api/users/profile/physical - Get physical profile
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const userProfile = await dynamoService.getUserProfile(user.userId);
    
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    return createApiResponse({
      physicalProfile: userProfile.physicalProfile || null
    });

  } catch (error) {
    console.error('Get physical profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

// PUT /api/users/profile/physical - Update physical profile
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const { physicalProfile } = await request.json();

    if (!physicalProfile) {
      return createErrorResponse('Physical profile data is required', 400);
    }

    // Validate physical profile
    const validation = validatePhysicalProfile(physicalProfile);
    if (!validation.valid) {
      return createErrorResponse(`Validation errors: ${validation.errors.join(', ')}`, 400);
    }

    // Update physical profile
    await dynamoService.updateUserProfile(user.userId, { physicalProfile });

    return createApiResponse({
      message: 'Physical profile updated successfully',
      physicalProfile
    });

  } catch (error) {
    console.error('Update physical profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});