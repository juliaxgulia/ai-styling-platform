// Comprehensive tests for error handling and recovery mechanisms

import { 
  AppError, 
  AIServiceError, 
  PhotoAnalysisError, 
  ConversationError, 
  SessionExpiredError,
  RetryManager,
  formatErrorResponse,
  generateRequestId,
  getUserFriendlyMessage
} from '@/lib/errors';
import { AIRetryService } from '@/lib/retry-service';

// Import SessionRecoveryManager separately to handle the class properly
const { SessionRecoveryManager } = require('@/lib/retry-service');

// Mock localStorage for session recovery tests
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Error Classes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(
        'TEST_ERROR',
        'Test message',
        400,
        { detail: 'test' },
        true,
        5000,
        [{ type: 'retry', label: 'Retry', description: 'Try again' }]
      );

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(5000);
      expect(error.recoveryActions).toHaveLength(1);
    });
  });

  describe('AIServiceError', () => {
    it('should create AI service error with recovery actions', () => {
      const error = new AIServiceError('AI service failed');
      
      expect(error.code).toBe('AI_SERVICE_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.recoveryActions).toContainEqual(
        expect.objectContaining({ type: 'retry', label: 'Try Again' })
      );
    });

    it('should include fallback for conversation errors', () => {
      const error = new AIServiceError('conversation service failed');
      
      expect(error.recoveryActions).toContainEqual(
        expect.objectContaining({ 
          type: 'fallback', 
          label: 'Use Structured Form' 
        })
      );
    });
  });

  describe('PhotoAnalysisError', () => {
    it('should create photo analysis error with manual input option for low confidence', () => {
      const error = new PhotoAnalysisError('Low confidence analysis', 0.5);
      
      expect(error.code).toBe('PHOTO_ANALYSIS_ERROR');
      expect(error.recoveryActions).toContainEqual(
        expect.objectContaining({ 
          type: 'manual', 
          label: 'Manual Input' 
        })
      );
    });
  });

  describe('SessionExpiredError', () => {
    it('should create session expired error with recovery actions', () => {
      const error = new SessionExpiredError('onboarding');
      
      expect(error.code).toBe('SESSION_EXPIRED');
      expect(error.message).toBe('Your onboarding has expired');
      expect(error.recoveryActions).toContainEqual(
        expect.objectContaining({ 
          type: 'session_recovery', 
          label: 'Resume Session' 
        })
      );
    });
  });
});

describe('Error Response Formatting', () => {
  it('should format AppError correctly', () => {
    const error = new AIServiceError('Test error');
    const requestId = 'test-123';
    
    const formatted = formatErrorResponse(error, requestId);
    
    expect(formatted.error.code).toBe('AI_SERVICE_ERROR');
    expect(formatted.error.message).toBe('Test error');
    expect(formatted.error.requestId).toBe(requestId);
    expect(formatted.error.retryable).toBe(true);
    expect(formatted.error.recoveryActions).toBeDefined();
  });

  it('should format generic error correctly', () => {
    const error = new Error('Generic error');
    const requestId = 'test-123';
    
    const formatted = formatErrorResponse(error, requestId);
    
    expect(formatted.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(formatted.error.message).toBe('An unexpected error occurred');
    expect(formatted.error.retryable).toBe(true);
  });

  it('should generate unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
  });
});

describe('User-Friendly Messages', () => {
  it('should return appropriate user-friendly messages', () => {
    const aiError = new AIServiceError('Technical AI error');
    const photoError = new PhotoAnalysisError('Technical photo error');
    const sessionError = new SessionExpiredError();
    
    expect(getUserFriendlyMessage(aiError)).toBe(
      'Our AI is having trouble right now. Please try again in a moment.'
    );
    expect(getUserFriendlyMessage(photoError)).toBe(
      'We couldn\'t analyze your photo clearly. Try a different photo with better lighting.'
    );
    expect(getUserFriendlyMessage(sessionError)).toBe(
      'Your session has expired, but we can help you pick up where you left off.'
    );
  });
});

describe('RetryManager', () => {
  it('should retry operation on retryable errors', async () => {
    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new AIServiceError('Temporary failure');
      }
      return 'success';
    });

    const result = await RetryManager.withRetry(operation, {
      maxRetries: 3,
      baseDelay: 10 // Short delay for testing
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const operation = jest.fn().mockImplementation(() => {
      throw new Error('Non-retryable error');
    });

    await expect(RetryManager.withRetry(operation)).rejects.toThrow('Non-retryable error');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should respect max retries limit', async () => {
    const operation = jest.fn().mockImplementation(() => {
      throw new AIServiceError('Always fails');
    });

    await expect(RetryManager.withRetry(operation, { maxRetries: 2 }))
      .rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should call onRetry callback', async () => {
    const onRetry = jest.fn();
    const operation = jest.fn()
      .mockImplementationOnce(() => { throw new AIServiceError('Fail once'); })
      .mockImplementationOnce(() => 'success');

    await RetryManager.withRetry(operation, {
      maxRetries: 2,
      baseDelay: 10,
      onRetry
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.any(AIServiceError),
      1
    );
  });
});

describe('AIRetryService', () => {
  describe('retryConversation', () => {
    it('should retry conversation operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new ConversationError('Temporary failure');
        }
        return { response: 'success' };
      });

      const result = await AIRetryService.retryConversation(operation);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ response: 'success' });
      expect(result.attempts).toBe(2);
    });

    it('should return error result on failure', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new ConversationError('Persistent failure');
      });

      const result = await AIRetryService.retryConversation(operation, { maxRetries: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ConversationError);
      expect(result.attempts).toBe(2); // Initial + 1 retry
    });
  });

  describe('retryPhotoAnalysis', () => {
    it('should retry photo analysis with confidence checking', async () => {
      const operation = jest.fn()
        .mockImplementationOnce(() => ({ confidence: 0.5, result: 'low confidence' }))
        .mockImplementationOnce(() => ({ confidence: 0.8, result: 'high confidence' }));

      const result = await AIRetryService.retryPhotoAnalysis(operation, 0.7);

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe(0.8);
      expect(result.attempts).toBe(2);
    });

    it('should return low confidence result with error', async () => {
      const operation = jest.fn().mockImplementation(() => ({ 
        confidence: 0.5, 
        result: 'consistently low confidence' 
      }));

      const result = await AIRetryService.retryPhotoAnalysis(operation, 0.7, { maxRetries: 1 });

      expect(result.success).toBe(false);
      expect(result.data?.confidence).toBe(0.5);
      expect(result.error).toBeInstanceOf(PhotoAnalysisError);
    });
  });

  describe('withCircuitBreaker', () => {
    beforeEach(() => {
      // Reset circuit breaker state
      (AIRetryService as any).circuitBreakerState.clear();
    });

    it('should allow operations when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await AIRetryService.withCircuitBreaker(operation, 'test-service');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service failure'));

      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await AIRetryService.withCircuitBreaker(operation, 'test-service', 5);
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should now be open
      await expect(
        AIRetryService.withCircuitBreaker(operation, 'test-service', 5)
      ).rejects.toThrow('Service test-service is temporarily unavailable');
    });
  });
});

describe('SessionRecoveryManager', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('should save and retrieve recovery data', async () => {
    const recoveryData = {
      sessionId: 'test-session',
      userId: 'test-user',
      sessionType: 'onboarding' as const,
      lastActivity: new Date().toISOString(),
      recoveryData: { step: 'emotions' }
    };

    await SessionRecoveryManager.saveRecoveryData(recoveryData);
    const retrieved = await SessionRecoveryManager.getRecoveryData('test-user', 'onboarding');

    expect(retrieved).toMatchObject(recoveryData);
    expect(retrieved?.savedAt).toBeDefined();
  });

  it('should return null for expired data', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    const recoveryData = {
      sessionId: 'test-session',
      userId: 'test-user',
      sessionType: 'onboarding' as const,
      lastActivity: oldDate.toISOString(),
      recoveryData: { step: 'emotions' },
      savedAt: oldDate.toISOString()
    };

    mockLocalStorage.setItem(
      'session_recovery_test-user_onboarding',
      JSON.stringify(recoveryData)
    );

    const retrieved = await SessionRecoveryManager.getRecoveryData('test-user', 'onboarding');

    expect(retrieved).toBeNull();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'session_recovery_test-user_onboarding'
    );
  });

  it('should clear recovery data', async () => {
    const recoveryData = {
      sessionId: 'test-session',
      userId: 'test-user',
      sessionType: 'onboarding' as const,
      lastActivity: new Date().toISOString(),
      recoveryData: { step: 'emotions' }
    };

    await SessionRecoveryManager.saveRecoveryData(recoveryData);
    await SessionRecoveryManager.clearRecoveryData('test-user', 'onboarding');

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'session_recovery_test-user_onboarding'
    );
  });

  it('should handle localStorage errors gracefully', async () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    // Should not throw
    await expect(SessionRecoveryManager.saveRecoveryData({
      sessionId: 'test',
      userId: 'test',
      sessionType: 'onboarding',
      lastActivity: new Date().toISOString(),
      recoveryData: {}
    })).resolves.toBeUndefined();
  });
});

describe('Integration Tests', () => {
  it('should handle complete error recovery flow', async () => {
    let attempts = 0;
    const mockConversationOperation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) {
        throw new ConversationError('Network timeout');
      } else if (attempts === 2) {
        throw new AIServiceError('Service overloaded');
      } else {
        return { response: 'Hello! Let\'s start your style profile.' };
      }
    });

    const result = await AIRetryService.retryConversation(mockConversationOperation, {
      maxRetries: 3,
      baseDelay: 10
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.data?.response).toBe('Hello! Let\'s start your style profile.');
  });

  it('should handle photo analysis with session recovery', async () => {
    // Simulate session recovery data
    const recoveryData = {
      sessionId: 'recovered-session',
      userId: 'test-user',
      sessionType: 'analysis' as const,
      lastActivity: new Date().toISOString(),
      recoveryData: { analysisType: 'body-shape' }
    };

    await SessionRecoveryManager.saveRecoveryData(recoveryData);

    const retrieved = await SessionRecoveryManager.getRecoveryData('test-user', 'analysis');
    expect(retrieved?.sessionId).toBe('recovered-session');

    // Simulate successful analysis after recovery
    const analysisOperation = jest.fn().mockResolvedValue({
      bodyShape: 'hourglass',
      confidence: 0.85,
      reasoning: 'Clear silhouette detected'
    });

    const result = await AIRetryService.retryPhotoAnalysis(analysisOperation, 0.7);

    expect(result.success).toBe(true);
    expect(result.data?.confidence).toBe(0.85);

    // Clear recovery data after successful completion
    await SessionRecoveryManager.clearRecoveryData('test-user', 'analysis');
    const clearedData = await SessionRecoveryManager.getRecoveryData('test-user', 'analysis');
    expect(clearedData).toBeNull();
  });
});