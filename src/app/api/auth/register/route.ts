import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dynamoService } from '@/lib/dynamodb';
import { UserProfile } from '@/types/user';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { validateRegistrationData } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    const validation = validateRegistrationData({ email, password });
    if (!validation.valid) {
      return createErrorResponse(`Validation errors: ${validation.errors.join(', ')}`, 400);
    }

    const userId = uuidv4();

    // Check if user already exists by email
    const existingUser = await dynamoService.getUserByEmail(email);
    if (existingUser) {
      return createErrorResponse('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user profile
    const userProfile: UserProfile = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      email,
      createdAt: new Date().toISOString(),
      styleProfile: {
        emotions: [],
        archetype: [],
        essence: [],
        lifestyle: [],
        values: []
      },
      preferences: {
        zipCode: '',
        maxBudget: 0
      }
    };

    // Store user profile
    await dynamoService.createUserProfile(userProfile);

    // Store password separately
    await dynamoService.createUserAuth(userId, hashedPassword);

    return createApiResponse({
      message: 'User registered successfully',
      userId
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}