import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dynamoService } from '@/lib/dynamodb';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return createErrorResponse('Email and password are required', 400);
    }

    // Find user by email
    const userAuth = await dynamoService.getUserByEmail(email);
    if (!userAuth) {
      return createErrorResponse('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userAuth.hashedPassword);
    if (!isValidPassword) {
      return createErrorResponse('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: userAuth.userId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get user profile
    const userProfile = await dynamoService.getUserProfile(userAuth.userId);

    const response = createApiResponse({
      message: 'Login successful',
      user: {
        id: userAuth.userId,
        email: userProfile?.email,
        createdAt: userProfile?.createdAt
      }
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}