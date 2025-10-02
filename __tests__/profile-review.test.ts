import { GET, PUT } from '@/app/api/profile/review/route';
import { validateAuth } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/dynamodb');
jest.mock('@/lib/bedrock', () => ({
  bedrockService: {
    sendMessage: jest.fn(),
  },
}));

const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;

describe('/api/profile/review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth validation success
    mockValidateAuth.mockResolvedValue({
      success: true,
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
  });

  describe('GET', () => {
    it('should return user profile for review', async () => {
      const mockUserProfile = {
        PK: 'USER#test-user-id',
        SK: 'PROFILE',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        styleProfile: {
          emotions: ['Confident', 'Powerful'],
          archetype: ['The Hero'],
          essence: ['Classic'],
          lifestyle: ['Professional'],
          values: ['High Quality'],
        },
        preferences: {
          zipCode: '10001',
          maxBudget: 500,
        },
      };

      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.profile.styleProfile).toEqual(mockUserProfile.styleProfile);
      expect(data.data.profile.preferences).toEqual(mockUserProfile.preferences);
      expect(data.data.availableOptions).toBeDefined();
      expect(data.data.availableOptions.emotions).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateAuth.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 404 when user profile not found', async () => {
      mockDynamoService.getUserProfile.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('User profile not found');
    });

    it('should return 400 when style profile is incomplete', async () => {
      const mockIncompleteProfile = {
        PK: 'USER#test-user-id',
        SK: 'PROFILE',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        styleProfile: null,
        preferences: null,
      };

      mockDynamoService.getUserProfile.mockResolvedValue(mockIncompleteProfile);

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Style profile not complete');
    });
  });

  describe('PUT', () => {
    it('should update user profile successfully', async () => {
      const requestBody = {
        styleProfile: {
          emotions: ['Confident', 'Bold'],
          archetype: ['The Hero', 'The Creator'],
        },
        preferences: {
          zipCode: '90210',
          maxBudget: 750,
        },
      };

      const mockUserProfile = {
        PK: 'USER#test-user-id',
        SK: 'PROFILE',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        styleProfile: {
          emotions: ['Confident', 'Powerful'],
          archetype: ['The Hero'],
          essence: ['Classic'],
          lifestyle: ['Professional'],
          values: ['High Quality'],
        },
        preferences: {
          zipCode: '10001',
          maxBudget: 500,
        },
      };

      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.updatedProfile.styleProfile.emotions).toEqual(['Confident', 'Bold']);
      expect(data.data.updatedProfile.styleProfile.archetype).toEqual(['The Hero', 'The Creator']);
      expect(data.data.updatedProfile.preferences.zipCode).toBe('90210');
      expect(data.data.updatedProfile.preferences.maxBudget).toBe(750);

      expect(mockDynamoService.updateUserProfile).toHaveBeenCalledWith('test-user-id', {
        styleProfile: expect.objectContaining({
          emotions: ['Confident', 'Bold'],
          archetype: ['The Hero', 'The Creator'],
        }),
        preferences: expect.objectContaining({
          zipCode: '90210',
          maxBudget: 750,
        }),
      });
    });

    it('should filter out invalid tags', async () => {
      const requestBody = {
        styleProfile: {
          emotions: ['Confident', 'InvalidEmotion'],
          archetype: ['The Hero', 'InvalidArchetype'],
        },
      };

      const mockUserProfile = {
        PK: 'USER#test-user-id',
        SK: 'PROFILE',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        styleProfile: {
          emotions: ['Powerful'],
          archetype: ['The Creator'],
          essence: ['Classic'],
          lifestyle: ['Professional'],
          values: ['High Quality'],
        },
        preferences: {
          zipCode: '10001',
          maxBudget: 500,
        },
      };

      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.updatedProfile.styleProfile.emotions).toEqual(['Confident']);
      expect(data.data.updatedProfile.styleProfile.archetype).toEqual(['The Hero']);
    });

    it('should validate zip code format', async () => {
      const requestBody = {
        preferences: {
          zipCode: 'invalid-zip',
        },
      };

      const mockUserProfile = {
        PK: 'USER#test-user-id',
        SK: 'PROFILE',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        styleProfile: {
          emotions: ['Confident'],
          archetype: ['The Hero'],
          essence: ['Classic'],
          lifestyle: ['Professional'],
          values: ['High Quality'],
        },
        preferences: {
          zipCode: '10001',
          maxBudget: 500,
        },
      };

      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should keep original zip code since invalid one was provided
      expect(data.data.updatedProfile.preferences.zipCode).toBe('10001');
    });

    it('should validate budget range', async () => {
      const requestBody = {
        preferences: {
          maxBudget: 15000, // Too high
        },
      };

      const mockUserProfile = {
        PK: 'USER#test-user-id',
        SK: 'PROFILE',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        styleProfile: {
          emotions: ['Confident'],
          archetype: ['The Hero'],
          essence: ['Classic'],
          lifestyle: ['Professional'],
          values: ['High Quality'],
        },
        preferences: {
          zipCode: '10001',
          maxBudget: 500,
        },
      };

      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should keep original budget since invalid one was provided
      expect(data.data.updatedProfile.preferences.maxBudget).toBe(500);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateAuth.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const requestBody = {
        styleProfile: {
          emotions: ['Confident'],
        },
      };

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 404 when user profile not found', async () => {
      mockDynamoService.getUserProfile.mockResolvedValue(null);

      const requestBody = {
        styleProfile: {
          emotions: ['Confident'],
        },
      };

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('User profile not found');
    });
  });
});