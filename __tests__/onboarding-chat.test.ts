import { POST } from '@/app/api/chat/onboarding/route';
import { bedrockService } from '@/lib/bedrock';
import { dynamoService } from '@/lib/dynamodb';
import { validateAuth } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/bedrock');
jest.mock('@/lib/dynamodb');
jest.mock('@/lib/auth');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-session-id'),
}));

const mockBedrockService = bedrockService as jest.Mocked<typeof bedrockService>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;
const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>;

describe('/api/chat/onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth validation success
    mockValidateAuth.mockResolvedValue({
      success: true,
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
  });

  describe('POST', () => {
    it('should create new onboarding session and respond to first message', async () => {
      const requestBody = {
        message: 'Hi, I want to discover my style!',
      };

      mockDynamoService.createOnboardingSession.mockResolvedValue();
      mockBedrockService.sendMessage.mockResolvedValue(
        'Hello! I\'m excited to help you discover your personal style. Let\'s start by talking about how you want to feel when you\'re wearing your clothes. Do you prefer feeling confident and powerful, or more relaxed and comfortable?'
      );

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessionId).toBe('test-session-id');
      expect(data.data.currentStep).toBe('emotions');
      expect(data.data.isComplete).toBe(false);
      expect(data.data.response).toContain('Hello!');

      expect(mockDynamoService.createOnboardingSession).toHaveBeenCalled();
      expect(mockDynamoService.updateOnboardingSession).toHaveBeenCalled();
    });

    it('should continue existing onboarding session', async () => {
      const existingSession = {
        PK: 'USER#test-user-id',
        SK: 'ONBOARDING#existing-session',
        conversationHistory: [
          {
            role: 'assistant' as const,
            content: 'How do you want to feel in your clothes?',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        ],
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const requestBody = {
        message: 'I want to feel confident and powerful',
        sessionId: 'existing-session',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(existingSession);
      mockDynamoService.updateOnboardingSession.mockResolvedValue();
      mockBedrockService.sendMessage.mockResolvedValue(
        'Great! Confidence and power are wonderful feelings to embody through your style. Now let\'s talk about your personality. Are you more of a leader type, or do you prefer to be creative and artistic?'
      );

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessionId).toBe('existing-session');
      expect(mockDynamoService.getOnboardingSession).toHaveBeenCalledWith(
        'test-user-id',
        'existing-session'
      );
    });

    it('should extract style preferences from conversation', async () => {
      const existingSession = {
        PK: 'USER#test-user-id',
        SK: 'ONBOARDING#test-session',
        conversationHistory: [
          {
            role: 'assistant' as const,
            content: 'How do you want to feel in your clothes?',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        ],
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const requestBody = {
        message: 'I want to feel confident, powerful, and chic',
        sessionId: 'test-session',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(existingSession);
      mockDynamoService.updateOnboardingSession.mockResolvedValue();
      
      // Mock AI responses
      mockBedrockService.sendMessage
        .mockResolvedValueOnce('That\'s wonderful! Confidence, power, and chic style are a great combination.')
        .mockResolvedValueOnce('{"emotions": ["Confident", "Powerful", "Chic"]}');

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.extractedData.emotions).toEqual(['Confident', 'Powerful', 'Chic']);
      expect(data.data.currentStep).toBe('archetype');
    });

    it('should mark onboarding as complete when all data is collected', async () => {
      const completeSession = {
        PK: 'USER#test-user-id',
        SK: 'ONBOARDING#test-session',
        conversationHistory: [],
        currentStep: 'budget',
        extractedData: {
          emotions: ['Confident', 'Powerful'],
          archetype: ['The Hero'],
          essence: ['Classic'],
          lifestyle: ['Professional'],
          values: ['High Quality'],
          zipCode: '10001',
        },
        isComplete: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const requestBody = {
        message: 'My budget is around $500 per month',
        sessionId: 'test-session',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(completeSession);
      mockDynamoService.updateOnboardingSession.mockResolvedValue();
      
      mockBedrockService.sendMessage
        .mockResolvedValueOnce('Perfect! I have all the information I need to create your style profile.')
        .mockResolvedValueOnce('{"maxBudget": 500}');

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.isComplete).toBe(true);
      expect(data.data.currentStep).toBe('complete');
      expect(data.data.extractedData.maxBudget).toBe(500);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockValidateAuth.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const requestBody = {
        message: 'Hi there!',
      };

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
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

    it('should return 400 for empty message', async () => {
      const requestBody = {
        message: '',
      };

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Message is required');
    });

    it('should return 404 for invalid session ID', async () => {
      const requestBody = {
        message: 'Hello',
        sessionId: 'invalid-session',
      };

      mockDynamoService.getOnboardingSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Session not found');
    });

    it('should handle AI service errors gracefully', async () => {
      const requestBody = {
        message: 'Hi there!',
      };

      mockDynamoService.createOnboardingSession.mockResolvedValue();
      mockBedrockService.sendMessage.mockRejectedValue(new Error('AI service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to process chat message');
    });
  });
});