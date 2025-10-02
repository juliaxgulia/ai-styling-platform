import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET_NAME } from './aws-config';

export class S3Service {
  private bucketName = S3_BUCKET_NAME;

  // Generate signed URL for secure image upload with privacy controls
  async generateUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      // Add privacy and security metadata
      Metadata: {
        'uploaded-at': new Date().toISOString(),
        'content-type': contentType,
        'privacy-level': 'private'
      },
      // Set server-side encryption
      ServerSideEncryption: 'AES256',
      // Add lifecycle policy tags for automatic expiration
      Tagging: `AutoDelete=true&ExpiryDays=90&ContentType=${encodeURIComponent(contentType)}`
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Generate signed URL for secure image download
  async generateDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Generate unique key for user images
  generateImageKey(userId: string, type: 'body' | 'portrait', extension: string = 'jpg'): string {
    const timestamp = Date.now();
    return `users/${userId}/analysis/${type}-${timestamp}.${extension}`;
  }

  // Delete image from S3 (for privacy compliance)
  async deleteImage(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await s3Client.send(command);
  }

  // Validate image file metadata (for client-side validation)
  validateImageFile(fileName: string, fileType: string, fileSize?: number): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const minSize = 1024; // 1KB minimum

    // Validate file type
    if (!allowedTypes.includes(fileType)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
      };
    }

    // Validate file size if provided
    if (fileSize !== undefined) {
      if (fileSize > maxSize) {
        return {
          valid: false,
          error: 'File size too large. Please upload an image smaller than 10MB.',
        };
      }

      if (fileSize < minSize) {
        return {
          valid: false,
          error: 'File size too small. Please upload a valid image file.',
        };
      }
    }

    // Validate file extension matches content type (only if extension exists)
    const parts = fileName.split('.');
    if (parts.length > 1) {
      const extension = parts.pop()?.toLowerCase();
      const expectedExtensions: Record<string, string[]> = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/jpg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/webp': ['webp']
      };

      if (extension && expectedExtensions[fileType] && !expectedExtensions[fileType].includes(extension)) {
        return {
          valid: false,
          error: 'File extension does not match the file type.',
        };
      }
    }

    return { valid: true };
  }

  // Validate image dimensions and quality (for analysis requirements)
  validateImageForAnalysis(analysisType: 'body' | 'portrait'): { 
    minWidth: number; 
    minHeight: number; 
    recommendations: string[] 
  } {
    if (analysisType === 'body') {
      return {
        minWidth: 400,
        minHeight: 600,
        recommendations: [
          'Take a full-body photo from head to toe',
          'Stand straight with arms slightly away from body',
          'Use good lighting and a plain background',
          'Wear form-fitting clothes or minimal clothing',
          'Keep the camera at chest level'
        ]
      };
    } else {
      return {
        minWidth: 300,
        minHeight: 400,
        recommendations: [
          'Take a clear photo of your face and upper body',
          'Use natural lighting (near a window is best)',
          'Face the camera directly',
          'Remove sunglasses and heavy makeup if possible',
          'Use a plain background'
        ]
      };
    }
  }
}

export const s3Service = new S3Service();