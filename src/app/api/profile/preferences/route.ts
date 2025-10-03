import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { dynamoService } from '@/lib/dynamodb';
import { validateUserPreferences } from '@/lib/validation';
import { PreferenceValidationService } from '@/lib/preference-validation';
import { UserPreferences } from '@/types/user';

const preferenceValidator = new PreferenceValidationService();

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

    // Get climate info for the user's zip code
    let climateInfo = null;
    if (userProfile.preferences?.zipCode) {
      climateInfo = preferenceValidator.getClimateInfo(userProfile.preferences.zipCode);
    }

    // Return preferences data
    return createApiResponse({
      preferences: userProfile.preferences,
      climateInfo,
      budgetRangeSuggestions: preferenceValidator.getBudgetRangeSuggestions(),
      lastUpdated: userProfile.createdAt
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    return createErrorResponse('Failed to get preferences', 500);
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
    const { preferences } = body;

    if (!preferences) {
      return createErrorResponse('Missing required field: preferences', 400);
    }

    // Validate preferences data
    const validation = validateUserPreferences(preferences);
    if (!validation.valid) {
      return createErrorResponse('Invalid preferences data', 400, 'VALIDATION_ERROR');
    }

    // Additional validation using preference validation service
    const validationErrors: string[] = [];

    if (preferences.zipCode) {
      const zipValidation = preferenceValidator.validateZipCode(preferences.zipCode);
      if (!zipValidation.isValid) {
        validationErrors.push(zipValidation.error || 'Invalid zip code');
      }
    }

    if (preferences.maxBudget !== undefined) {
      const budgetValidation = preferenceValidator.validateBudget(preferences.maxBudget);
      if (!budgetValidation.isValid) {
        validationErrors.push(budgetValidation.error || 'Invalid budget');
      }
    }

    if (validationErrors.length > 0) {
      return createErrorResponse('Invalid preferences data', 400, 'VALIDATION_ERROR');
    }

    // Get existing user profile
    const existingProfile = await dynamoService.getUserProfile(user.userId);
    if (!existingProfile) {
      return createErrorResponse('User profile not found', 404);
    }

    // Update preferences
    const updatedPreferences: UserPreferences = {
      zipCode: preferences.zipCode || existingProfile.preferences?.zipCode || '',
      maxBudget: preferences.maxBudget !== undefined ? preferences.maxBudget : existingProfile.preferences?.maxBudget || 0
    };

    const updates = {
      preferences: updatedPreferences,
      updatedAt: new Date().toISOString()
    };

    await dynamoService.updateUserProfile(user.userId, updates);

    // Get climate info for response
    const climateInfo = preferenceValidator.getClimateInfo(updatedPreferences.zipCode);

    return createApiResponse({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences,
      climateInfo,
      budgetRangeSuggestions: preferenceValidator.getBudgetRangeSuggestions()
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    return createErrorResponse('Failed to update preferences', 500);
  }
}