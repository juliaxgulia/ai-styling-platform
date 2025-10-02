import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  const response = createApiResponse({
    message: 'Logged out successfully'
  });

  // Clear the auth cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  });

  return response;
}