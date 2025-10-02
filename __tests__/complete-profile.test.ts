import { POST } from '@/app/api/chat/complete-profile/route';
import { validateAuth } from '@/lib/auth';
import { dynamoService } from '@/lib/dynamodb';
import { schemaExtractionService } from '@/lib/schema-extraction';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/dynamodb');
jest.mock('@/lib/schema-extraction');
jest.mock('@/lib/bedrock', () => ({
  bedrockService: {
    sendMessage: jest.fn(),
  },
}));

const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;
const mockSchemaExtractionService = schemaExtractionService as jest.Mocked<typeof schemaExtractionService>;

describe('/api/chat/complete-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth validation success
    mockValidateAuth.mockResolvedValue({
      success: true,
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
  });

  describe('POST', () => {
    it('should complete profile successfully', async () => {
      const requestBody = {
        sessionId: 'test-session-id',
      };

      const mockSession = {
        PK: 'USER#test-user-id',
        SK: 'ONBOARDING#test-session-id',
        conversationHistory: [
          {
            role: 'user' as const,
            content: 'I want to feel confident and powerful',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        ],
        currentStep: 'complete',
        extractedData: {
          emotions: ['Confident', 'Powerful'],
          archetype: ['The Hero'],
          essence: ['Classic'],
          lifestyle: ['Professional'],
          values: ['High Quality'],
          zipCode: '10001',
          maxBudget: 500,
        },
        isComplete: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const mockUserProfile = {
        PK: 'USER#test-user-id',
        SK: 'PROFILE',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        styleProfile: {
          emotions: [],
          archetype: [],
          essence: [],
          lifestyle: [],
          values: [],
        },
        preferences: {
          zipCode: '',
          maxBudget: 0,
        },
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(mockSession);
      mockDynamoService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockDynamoService.updateUserProfile.mockResolvedValue();
      
      mockSchemaExtractionService.extractAllPreferences.mockResolvedValue({
        emotions: ['Confident', 'Powerful'],
        archetype: ['The Hero'],
        essence: ['Classic'],
        lifestyle: ['Professional'],
        values: ['High Quality'],
        zipCode: '10001',
        maxBudget: 500,
      });

      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.profile.styleProfile).toEqual({
        emotions: ['Confident', 'Powerful'],
        archetype: ['The Hero'],
        essence: ['Classic'],
        lifestyle: ['Professional'],
        values: ['High Quality'],
      });
      expect(data.data.profile.preferences).toEqual({
        zipCode: '10001',
        maxBudget: 500,
      });
      expect(data.data.summary).toBeDefined();
      expect(data.data.recommendations).toHaveLength(5);

      expect(mockDynamoService.updateUserProfile).toHaveBeenCalledWith('test-user-id', {
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
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateAuth.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const requestBody = {
        sessionId: 'test-session-id',
      };

      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 400 for missing session ID', async () => {
      const requestBody = {};

      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Session ID is required');
    });

    it('should return 404 for non-existent session', async () => {
      const requestBody = {
        sessionId: 'non-existent-session',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Onboarding session not found');
    });

    it('should return 400 for incomplete session', async () => {
      const requestBody = {
        sessionId: 'incomplete-session',
      };

      const mockIncompleteSession = {
        PK: 'USER#test-user-id',
        SK: 'ONBOARDING#incomplete-session',
        conversationHistory: [],
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(mockIncompleteSession);

      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Onboarding session is not complete');
    });

    it('should return 400 for incomplete profile data', async () => {
      const requestBody = {
        sessionId: 'test-session-id',
      };

      const mockSession = {
        PK: 'USER#test-user-id',
        SK: 'ONBOARDING#test-session-id',
        conversationHistory: [],
        currentStep: 'complete',
        extractedData: {},
        isComplete: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(mockSession);
      
      // Return incomplete data
      mockSchemaExtractionService.extractAllPreferences.mockResolvedValue({
        emotions: ['Confident'],
        archetype: [],
        essence: [],
        lifestyle: [],
        values: [],
        zipCode: undefined,
        maxBudget: undefined,
      });

      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Incomplete profile data');
    });

    it('should return 404 when user profile not found', async () => {
      const requestBody = {
        sessionId: 'test-session-id',
      };

      const mockSession = {
        PK: 'USER#test-user-id',
        SK: 'ONBOARDING#test-session-id',
        conversationHistory: [],
        currentStep: 'complete',
        extractedData: {},
        isComplete: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(mockSession);
      mockDynamoService.getUserProfile.mockResolvedValue(null);
      
      mockSchemaExtractionService.extractAllPreferences.mockResolvedValue({
        emotions: ['Confident'],
        archetype: ['The Hero'],
        essence: ['Classic'],
        lifestyle: ['Professional'],
        values: ['High Quality'],
        zipCode: '10001',
        maxBudget: 500,
      });

      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('User profile not found');
    });
  });
});