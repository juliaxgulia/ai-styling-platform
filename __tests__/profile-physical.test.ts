import { GET, PUT } from '@/app/api/profile/physical/route';
import { getAuthUser } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { validatePhysicalProfile } from '@/lib/validation';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/dynamodb');
jest.mock('@/lib/validation');

const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;
const mockValidatePhysicalProfile = validatePhysicalProfile as jest.MockedFunction<typeof validatePhysicalProfile>;

describe('/api/profile/physical', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body?: any) => {
    return {
      json: jest.fn().mockResolvedValue(body || {}),
    } as unknown as NextRequest;
  };

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
  };

  const mockUserProfile = {
    PK: 'USER#user123',
    SK: 'PROFILE',
    email: 'test@example.com',
    createdAt: '2024-01-01T00:00:00.000Z',
    styleProfile: {
      emotions: ['Confident'],
      archetype: ['The Hero'],
      essence: ['Classic'],
      lifestyle: ['Professional'],
      values: ['High Quality']
    },
    preferences: {
      zipCode: '10001',
      maxBudget: 500
    },
    physicalProfile: {
      bodyShape: 'middle_balance',
      bodyShapeConfidence: 0.85,
      colorPalette: {
        season: 'True Winter',
        colors: ['true red', 'royal blue', 'pure white', 'black'],
        confidence: 0.90
      }
    },
    analysisPhotos: {
      bodyPhotoUrl: 'https://example.com/body.jpg',
      portraitPhotoUrl: 'https://example.com/portrait.jpg'
    }
  };

  describe('GET', () => {
    it('should return user physical profile successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.physicalProfile).toEqual(mockUserProfile.physicalProfile);
      expect(data.data.analysisPhotos).toEqual(mockUserProfile.analysisPhotos);
      expect(data.data.lastUpdated).toBe(mockUserProfile.createdAt);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 404 when user profile not found', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('User profile not found');
    });
  });  describe(
'PUT', () => {
    const validPhysicalProfile = {
      bodyShape: 'lower_balance',
      bodyShapeConfidence: 0.88,
      colorPalette: {
        season: 'Deep Autumn',
        colors: ['burgundy', 'forest green', 'chocolate brown'],
        confidence: 0.82
      }
    };

    it('should update physical profile successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockValidatePhysicalProfile.mockReturnValue({
        isValid: true,
        validData: validPhysicalProfile,
        errors: []
      });
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = createMockRequest({
        physicalProfile: validPhysicalProfile
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Physical profile updated successfully');
    });

    it('should return 400 for invalid physical profile data', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockValidatePhysicalProfile.mockReturnValue({
        isValid: false,
        validData: {},
        errors: ['Invalid body shape', 'Invalid confidence score']
      });

      const request = createMockRequest({
        physicalProfile: {
          bodyShape: 'invalid_shape',
          bodyShapeConfidence: 1.5
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Invalid physical profile data');
    });
  });
});