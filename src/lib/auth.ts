import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { dynamoService } from './dynamodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  userId: string;
  email: string;
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return null;
    }

    // Get user profile
    const userProfile = await dynamoService.getUserProfile(decoded.userId);
    if (!userProfile) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: userProfile.email
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function validateAuth(request: NextRequest): Promise<{ success: true; user: { id: string; email: string } } | { success: false; error: string }> {
  const user = await getAuthUser(request);
  
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  return { 
    success: true, 
    user: { 
      id: user.userId, 
      email: user.email 
    } 
  };
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, user);
  };
}