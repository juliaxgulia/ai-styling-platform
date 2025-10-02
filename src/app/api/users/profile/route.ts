import { NextRequest } from 'next/server';
import { dynamoService } from '@/lib/dynamodb';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateStyleProfile, validateUserPreferences, validatePhysicalProfile } from '@/lib/validation';

// GET /api/users/profile - Get user profile
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const userProfile = await dynamoService.getUserProfile(user.userId);
    
    if (!userProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    // Remove sensitive data before sending
    const { PK, SK, ...profileData } = userProfile;
    
    return createApiResponse({
      profile: profileData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

// PUT /api/users/profile - Update user profile
export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const updates = await request.json();

    // Validate updates
    const errors: string[] = [];

    if (updates.styleProfile) {
      const styleValidation = validateStyleProfile(updates.styleProfile);
      if (!styleValidation.valid) {
        errors.push(...styleValidation.errors);
      }
    }

    if (updates.preferences) {
      const preferencesValidation = validateUserPreferences(updates.preferences);
      if (!preferencesValidation.valid) {
        errors.push(...preferencesValidation.errors);
      }
    }

    if (updates.physicalProfile) {
      const physicalValidation = validatePhysicalProfile(updates.physicalProfile);
      if (!physicalValidation.valid) {
        errors.push(...physicalValidation.errors);
      }
    }

    if (errors.length > 0) {
      return createErrorResponse(`Validation errors: ${errors.join(', ')}`, 400);
    }

    // Remove fields that shouldn't be updated
    const { PK, SK, email, createdAt, ...allowedUpdates } = updates;

    // Update user profile
    await dynamoService.updateUserProfile(user.userId, allowedUpdates);

    // Get updated profile
    const updatedProfile = await dynamoService.getUserProfile(user.userId);
    
    if (!updatedProfile) {
      return createErrorResponse('Failed to retrieve updated profile', 500);
    }

    const { PK: pk, SK: sk, ...profileData } = updatedProfile;

    return createApiResponse({
      message: 'Profile updated successfully',
      profile: profileData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});