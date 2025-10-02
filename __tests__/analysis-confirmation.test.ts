import { POST, GET } from '@/app/api/analysis/confirm/route';
import { getAuthUser } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/dynamodb');

const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;

describe('/api/analysis/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body?: any, searchParams?: Record<string, string>) => {
    const url = searchParams 
      ? `http://localhost:3000/api/analysis/confirm?${new URLSearchParams(searchParams).toString()}`
      : 'http://localhost:3000/api/analysis/confirm';
    
    return {
      json: jest.fn().mockResolvedValue(body || {}),
      url
    } as unknown as NextRequest;
  };

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
  };

  const mockBodyShapeAnalysis = {
    PK: 'USER#user123',
    SK: 'ANALYSIS#body-1234567890',
    type: 'body-shape',
    imageUrl: 'https://s3.amazonaws.com/test-image.jpg',
    results: {
      bodyShape: 'waist_balance',
      confidence: 0.85,
      reasoning: 'Clear hourglass silhouette with defined waist'
    },
    userConfirmed: false,
    createdAt: '2024-01-01T00:00:00.000Z'
  };

  const mockColorPaletteAnalysis = {
    PK: 'USER#user123',
    SK: 'ANALYSIS#color-1234567890',
    type: 'color-palette',
    imageUrl: 'https://s3.amazonaws.com/test-portrait.jpg',
    results: {
      colorPalette: {
        season: 'True Spring',
        colors: ['coral', 'peach', 'golden yellow'],
        skinTone: 'Warm undertones',
        hairColor: 'Golden blonde',
        eyeColor: 'Bright blue',
        characteristics: 'Warm, clear, bright colors'
      },
      confidence: 0.80,
      reasoning: 'Warm undertones and bright coloring indicate True Spring'
    },
    userConfirmed: false,
    createdAt: '2024-01-01T00:00:00.000Z'
  };

  const mockUserProfile = {
    PK: 'USER#user123',
    SK: 'PROFILE',
    email: 'test@example.com',
    physicalProfile: {},
    createdAt: '2024-01-01T00:00:00.000Z'
  };

  describe('POST', () => {
    it('should confirm body shape analysis successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(mockBodyShapeAnalysis);
      mockDynamoService.putItem.mockResolvedValue();
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = createMockRequest({
        analysisId: 'body-1234567890',
        confirmed: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.confirmed).toBe(true);
      expect(data.data.message).toBe('Analysis confirmed and profile updated');

      expect(mockDynamoService.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userConfirmed: true,
          confirmedAt: expect.any(String)
        })
      );

      expect(mockDynamoService.updateUserProfile).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          physicalProfile: expect.objectContaining({
            bodyShape: 'waist_balance',
            bodyShapeConfidence: 0.85,
            bodyShapeAnalysisId: 'body-1234567890'
          })
        })
      );
    });

    it('should confirm color palette analysis successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(mockColorPaletteAnalysis);
      mockDynamoService.putItem.mockResolvedValue();
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = createMockRequest({
        analysisId: 'color-1234567890',
        confirmed: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.confirmed).toBe(true);

      expect(mockDynamoService.updateUserProfile).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          physicalProfile: expect.objectContaining({
            colorPalette: expect.objectContaining({
              season: 'True Spring',
              colors: ['coral', 'peach', 'golden yellow'],
              skinTone: 'Warm undertones',
              hairColor: 'Golden blonde',
              eyeColor: 'Bright blue'
            }),
            colorAnalysisId: 'color-1234567890'
          })
        })
      );
    });

    it('should record rejection without updating profile', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(mockBodyShapeAnalysis);
      mockDynamoService.putItem.mockResolvedValue();

      const request = createMockRequest({
        analysisId: 'body-1234567890',
        confirmed: false
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.confirmed).toBe(false);
      expect(data.data.message).toBe('Analysis confirmation recorded');

      expect(mockDynamoService.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userConfirmed: false,
          confirmedAt: expect.any(String)
        })
      );

      expect(mockDynamoService.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should handle adjustments when confirming', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(mockBodyShapeAnalysis);
      mockDynamoService.putItem.mockResolvedValue();
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const adjustments = {
        bodyShape: 'upper_balance',
        confidence: 0.9
      };

      const request = createMockRequest({
        analysisId: 'body-1234567890',
        confirmed: true,
        adjustments
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(mockDynamoService.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userConfirmed: true,
          userAdjustments: adjustments
        })
      );

      expect(mockDynamoService.updateUserProfile).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          physicalProfile: expect.objectContaining({
            bodyShape: 'upper_balance',
            bodyShapeConfidence: 0.9
          })
        })
      );
    });

    it('should handle color palette adjustments', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(mockColorPaletteAnalysis);
      mockDynamoService.putItem.mockResolvedValue();
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const adjustments = {
        season: 'Light Spring',
        skinTone: 'Light warm undertones',
        confidence: 0.9
      };

      const request = createMockRequest({
        analysisId: 'color-1234567890',
        confirmed: true,
        adjustments
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDynamoService.updateUserProfile).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          physicalProfile: expect.objectContaining({
            colorPalette: expect.objectContaining({
              season: 'Light Spring',
              skinTone: 'Light warm undertones',
              confidence: 0.9
            })
          })
        })
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest({
        analysisId: 'test-123',
        confirmed: true
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
        analysisId: 'test-123'
        // Missing confirmed field
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Missing required fields: analysisId, confirmed');
    });

    it('should return 404 for non-existent analysis', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(null);

      const request = createMockRequest({
        analysisId: 'non-existent',
        confirmed: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Analysis result not found');
    });

    it('should return 500 for database errors', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        analysisId: 'test-123',
        confirmed: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to confirm analysis');
    });
  });

  describe('GET', () => {
    it('should get body shape analysis confirmation details', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(mockBodyShapeAnalysis);

      const request = createMockRequest(undefined, { analysisId: 'body-1234567890' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('body-shape');
      expect(data.data.results.bodyShape).toBe('waist_balance');
      expect(data.data.adjustmentOptions.bodyShapes).toHaveLength(5);
      expect(data.data.confidenceThreshold).toBe(0.7);
    });

    it('should get color palette analysis confirmation details', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(mockColorPaletteAnalysis);

      const request = createMockRequest(undefined, { analysisId: 'color-1234567890' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('color-palette');
      expect(data.data.results.colorPalette.season).toBe('True Spring');
      expect(data.data.adjustmentOptions.seasons).toHaveLength(12);
      expect(data.data.confidenceThreshold).toBe(0.7);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest(undefined, { analysisId: 'test-123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 400 for missing analysisId parameter', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);

      const request = createMockRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Missing required parameter: analysisId');
    });

    it('should return 404 for non-existent analysis', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockResolvedValue(null);

      const request = createMockRequest(undefined, { analysisId: 'non-existent' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Analysis result not found');
    });

    it('should return 500 for database errors', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getAnalysisResult.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest(undefined, { analysisId: 'test-123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to get analysis confirmation');
    });
  });
});