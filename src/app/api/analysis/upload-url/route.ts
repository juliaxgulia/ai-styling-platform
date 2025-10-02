import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from '@/lib/s3';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { fileName, fileType, analysisType } = body;

    // Validate required fields
    if (!fileName || !fileType || !analysisType) {
      return createErrorResponse('Missing required fields: fileName, fileType, analysisType', 400);
    }

    // Validate analysis type
    if (!['body', 'portrait'].includes(analysisType)) {
      return createErrorResponse('Invalid analysis type. Must be "body" or "portrait"', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      return createErrorResponse('Invalid file type. Please upload a JPEG, PNG, or WebP image.', 400);
    }

    // Extract file extension from fileName or fileType
    const getExtension = (fileName: string, fileType: string): string => {
      const extensionFromName = fileName.split('.').pop()?.toLowerCase();
      if (extensionFromName && ['jpg', 'jpeg', 'png', 'webp'].includes(extensionFromName)) {
        return extensionFromName;
      }
      
      // Fallback to file type mapping
      const typeMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg', 
        'image/png': 'png',
        'image/webp': 'webp'
      };
      return typeMap[fileType] || 'jpg';
    };

    const extension = getExtension(fileName, fileType);
    
    // Generate unique key for the image
    const imageKey = s3Service.generateImageKey(user.userId, analysisType as 'body' | 'portrait', extension);
    
    // Generate signed upload URL (expires in 1 hour)
    const uploadUrl = await s3Service.generateUploadUrl(imageKey, fileType, 3600);

    return createApiResponse({
      uploadUrl,
      imageKey,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Upload URL generation error:', error);
    return createErrorResponse('Failed to generate upload URL', 500);
  }
}