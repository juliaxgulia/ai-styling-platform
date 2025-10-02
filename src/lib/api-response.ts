import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export function createApiResponse<T>(data: T, status: number = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data
  };

  return NextResponse.json(response, { status });
}

export function createErrorResponse(message: string, status: number = 400, code?: string): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code
    }
  };

  return NextResponse.json(response, { status });
}