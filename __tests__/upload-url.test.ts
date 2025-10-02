import { POST } from '@/app/api/analysis/upload-url/route';
import { s3Service } from '@/lib/s3';
import { getAuthUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/s3');
jest.mock('@/lib/auth');

const mockS3Service = s3Service as jest.Mocked<typeof s3Service>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe('/api/analysis/upload-url', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
  };

  describe('POST', () => {
    it('should generate upload URL for valid body analysis request', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockS3Service.generateImageKey.mockReturnValue('users/user123/analysis/body-1234567890.jpg');
      mockS3Service.generateUploadUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

      const request = createMockRequest({
        fileName: 'body-photo.jpg',
        fileType: 'image/jpeg',
        analysisType: 'body'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        uploadUrl: 'https://s3.amazonaws.com/signed-url',
        imageKey: 'users/user123/analysis/body-1234567890.jpg',
        expiresIn: 3600
      });

      expect(mockS3Service.generateImageKey).toHaveBeenCalledWith('user123', 'body', 'jpg');
      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith(
        'users/user123/analysis/body-1234567890.jpg',
        'image/jpeg',
        3600
      );
    });

    it('should generate upload URL for valid portrait analysis request', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockS3Service.generateImageKey.mockReturnValue('users/user123/analysis/portrait-1234567890.png');
      mockS3Service.generateUploadUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

      const request = createMockRequest({
        fileName: 'portrait.png',
        fileType: 'image/png',
        analysisType: 'portrait'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockS3Service.generateImageKey).toHaveBeenCalledWith('user123', 'portrait', 'png');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest({
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
        analysisType: 'body'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 400 for missing required fields', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);

      const request = createMockRequest({
        fileName: 'test.jpg',
        // Missing fileType and analysisType
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Missing required fields: fileName, fileType, analysisType');
    });

    it('should return 400 for invalid analysis type', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);

      const request = createMockRequest({
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
        analysisType: 'invalid'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Invalid analysis type. Must be "body" or "portrait"');
    });

    it('should return 400 for invalid file type', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);

      const request = createMockRequest({
        fileName: 'test.gif',
        fileType: 'image/gif',
        analysisType: 'body'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    });

    it('should handle WebP files correctly', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockS3Service.generateImageKey.mockReturnValue('users/user123/analysis/body-1234567890.webp');
      mockS3Service.generateUploadUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

      const request = createMockRequest({
        fileName: 'photo.webp',
        fileType: 'image/webp',
        analysisType: 'body'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockS3Service.generateImageKey).toHaveBeenCalledWith('user123', 'body', 'webp');
    });

    it('should handle files without extension by using file type', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockS3Service.generateImageKey.mockReturnValue('users/user123/analysis/body-1234567890.jpg');
      mockS3Service.generateUploadUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

      const request = createMockRequest({
        fileName: 'photo',
        fileType: 'image/jpeg',
        analysisType: 'body'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockS3Service.generateImageKey).toHaveBeenCalledWith('user123', 'body', 'jpg');
    });

    it('should return 500 for S3 service errors', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockS3Service.generateImageKey.mockReturnValue('users/user123/analysis/body-1234567890.jpg');
      mockS3Service.generateUploadUrl.mockRejectedValue(new Error('S3 error'));

      const request = createMockRequest({
        fileName: 'test.jpg',
        fileType: 'image/jpeg',
        analysisType: 'body'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to generate upload URL');
    });
  });
});