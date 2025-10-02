import { GET, PUT } from '@/app/api/profile/style/route';
import { getAuthUser } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { validateStyleProfile } from '@/lib/validation';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/dynamodb');
jest.mock('@/lib/validation');

const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;
const mockValidateStyleProfile = validateStyleProfile as jest.MockedFunction<typeof validateStyleProfile>;

describe('/api/profile/style', () => {
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
      emotions: ['Confident', 'Comfortable'],
      archetype: ['The Hero'],
      essence: ['Classic'],
      lifestyle: ['Professional'],
      values: ['High Quality']
    },
    preferences: {
      zipCode: '10001',
      maxBudget: 500
    }
  };

  describe('GET', () => {
    it('should return user style profile successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.styleProfile).toEqual(mockUserProfile.styleProfile);
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

    it('should handle database errors', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to get style profile');
    });
  });

  describe('PUT', () => {
    const validStyleProfile = {
      emotions: ['Confident', 'Powerful'],
      archetype: ['The Ruler'],
      essence: ['Dramatic'],
      lifestyle: ['Professional', 'Social'],
      values: ['Luxury', 'High Quality']
    };

    it('should update style profile successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockValidateStyleProfile.mockReturnValue({
        isValid: true,
        validData: validStyleProfile,
        errors: []
      });
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = createMockRequest({
        styleProfile: validStyleProfile
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Style profile updated successfully');
      expect(data.data.styleProfile).toEqual(validStyleProfile);

      expect(mockDynamoService.updateUserProfile).toHaveBeenCalledWith(
        mockUser.userId,
        expect.objectContaining({
          styleProfile: validStyleProfile,
          updatedAt: expect.any(String)
        })
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest({
        styleProfile: validStyleProfile
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 400 for missing styleProfile', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);

      const request = createMockRequest({});

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Missing required field: styleProfile');
    });

    it('should return 400 for invalid style profile data', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockValidateStyleProfile.mockReturnValue({
        isValid: false,
        validData: {},
        errors: ['Invalid emotion tags', 'Invalid archetype tags']
      });

      const request = createMockRequest({
        styleProfile: {
          emotions: ['InvalidEmotion'],
          archetype: ['InvalidArchetype']
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Invalid style profile data');
    });

    it('should return 404 when user profile not found', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(null);
      mockValidateStyleProfile.mockReturnValue({
        isValid: true,
        validData: validStyleProfile,
        errors: []
      });

      const request = createMockRequest({
        styleProfile: validStyleProfile
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('User profile not found');
    });

    it('should handle partial style profile updates', async () => {
      const partialStyleProfile = {
        emotions: ['Relaxed', 'Comfortable']
      };

      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockValidateStyleProfile.mockReturnValue({
        isValid: true,
        validData: {
          emotions: ['Relaxed', 'Comfortable'],
          archetype: [],
          essence: [],
          lifestyle: [],
          values: []
        },
        errors: []
      });
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = createMockRequest({
        styleProfile: partialStyleProfile
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.styleProfile.emotions).toEqual(['Relaxed', 'Comfortable']);
    });

    it('should handle database update errors', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockValidateStyleProfile.mockReturnValue({
        isValid: true,
        validData: validStyleProfile,
        errors: []
      });
      mockDynamoService.updateUserProfile.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        styleProfile: validStyleProfile
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to update style profile');
    });
  });
});