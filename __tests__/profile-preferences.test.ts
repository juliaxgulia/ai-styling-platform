import { GET, PUT } from '@/app/api/profile/preferences/route';
import { getAuthUser } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { validateUserPreferences } from '@/lib/validation';
import { PreferenceValidationService } from '@/lib/preference-validation';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/dynamodb');
jest.mock('@/lib/validation');
jest.mock('@/lib/preference-validation');

const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;
const mockValidateUserPreferences = validateUserPreferences as jest.MockedFunction<typeof validateUserPreferences>;
const MockPreferenceValidationService = PreferenceValidationService as jest.MockedClass<typeof PreferenceValidationService>;

describe('/api/profile/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the PreferenceValidationService methods
    MockPreferenceValidationService.prototype.getClimateInfo = jest.fn();
    MockPreferenceValidationService.prototype.getBudgetRangeSuggestions = jest.fn();
    MockPreferenceValidationService.prototype.validateZipCode = jest.fn();
    MockPreferenceValidationService.prototype.validateBudget = jest.fn();
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
    }
  };

  describe('GET', () => {
    it('should return user preferences successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      MockPreferenceValidationService.prototype.getClimateInfo = jest.fn().mockReturnValue({
        region: 'Northeast',
        climate: 'Temperate'
      });
      MockPreferenceValidationService.prototype.getBudgetRangeSuggestions = jest.fn().mockReturnValue([
        { min: 0, max: 100, label: 'Budget' },
        { min: 100, max: 500, label: 'Mid-range' },
        { min: 500, max: 1000, label: 'Premium' }
      ]);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preferences).toEqual(mockUserProfile.preferences);
      expect(data.data.climateInfo).toBeDefined();
      expect(data.data.budgetRangeSuggestions).toBeDefined();
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
  });

  describe('PUT', () => {
    const validPreferences = {
      zipCode: '90210',
      maxBudget: 750
    };

    it('should update preferences successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockValidateUserPreferences.mockReturnValue({
        isValid: true,
        validData: validPreferences,
        errors: []
      });
      MockPreferenceValidationService.prototype.validateZipCode = jest.fn().mockReturnValue({
        isValid: true,
        zipCode: '90210'
      });
      MockPreferenceValidationService.prototype.validateBudget = jest.fn().mockReturnValue({
        isValid: true,
        budget: 750
      });
      MockPreferenceValidationService.prototype.getClimateInfo = jest.fn().mockReturnValue({
        region: 'West Coast',
        climate: 'Mediterranean'
      });
      MockPreferenceValidationService.prototype.getBudgetRangeSuggestions = jest.fn().mockReturnValue([]);
      mockDynamoService.updateUserProfile.mockResolvedValue();

      const request = createMockRequest({
        preferences: validPreferences
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Preferences updated successfully');
      expect(data.data.preferences).toEqual(validPreferences);
    });

    it('should return 400 for invalid zip code', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockValidateUserPreferences.mockReturnValue({
        isValid: true,
        validData: { zipCode: 'invalid', maxBudget: 500 },
        errors: []
      });
      MockPreferenceValidationService.prototype.validateZipCode = jest.fn().mockReturnValue({
        isValid: false,
        error: 'Invalid zip code format'
      });

      const request = createMockRequest({
        preferences: { zipCode: 'invalid', maxBudget: 500 }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Invalid preferences data');
    });
  });
});