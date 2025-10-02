// Retry service for AI operations and photo analysis

import { 
  AIServiceError, 
  PhotoAnalysisError, 
  ConversationError, 
  RetryManager,
  AppError 
} from './errors';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface AIOperationResult<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  attempts: number;
  totalTime: number;
}

export class AIRetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  // Retry conversation operations with fallback
  static async retryConversation<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<AIOperationResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let attempts = 0;

    try {
      const result = await RetryManager.withRetry(
        async () => {
          attempts++;
          return await operation();
        },
        {
          maxRetries: finalConfig.maxRetries,
          baseDelay: finalConfig.baseDelay,
          maxDelay: finalConfig.maxDelay,
          shouldRetry: (error: Error, attempt: number) => {
            // Retry on AI service errors, but not on validation errors
            if (error instanceof AIServiceError || error instanceof ConversationError) {
              return attempt < finalConfig.maxRetries;
            }
            return false;
          },
          onRetry: (error: Error, attempt: number) => {
            console.warn(`Conversation retry attempt ${attempt}:`, error.message);
          }
        }
      );

      return {
        success: true,
        data: result,
        attempts,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AppError ? error : new ConversationError('Conversation failed after retries'),
        attempts,
        totalTime: Date.now() - startTime
      };
    }
  }

  // Retry photo analysis with confidence checking
  static async retryPhotoAnalysis<T>(
    operation: () => Promise<T & { confidence?: number }>,
    minConfidence: number = 0.7,
    config: Partial<RetryConfig> = {}
  ): Promise<AIOperationResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let attempts = 0;
    let lastResult: T & { confidence?: number } | undefined;

    try {
      const result = await RetryManager.withRetry(
        async () => {
          attempts++;
          const analysisResult = await operation();
          lastResult = analysisResult;

          // Check confidence threshold
          if (analysisResult.confidence !== undefined && analysisResult.confidence < minConfidence) {
            throw new PhotoAnalysisError(
              `Analysis confidence too low: ${analysisResult.confidence}`,
              analysisResult.confidence
            );
          }

          return analysisResult;
        },
        {
          maxRetries: finalConfig.maxRetries,
          baseDelay: finalConfig.baseDelay,
          maxDelay: finalConfig.maxDelay,
          shouldRetry: (error: Error, attempt: number) => {
            // Retry on AI service errors and low confidence, but not on validation errors
            if (error instanceof AIServiceError || error instanceof PhotoAnalysisError) {
              return attempt < finalConfig.maxRetries;
            }
            return false;
          },
          onRetry: (error: Error, attempt: number) => {
            console.warn(`Photo analysis retry attempt ${attempt}:`, error.message);
          }
        }
      );

      return {
        success: true,
        data: result,
        attempts,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      // If we have a low confidence result, return it with the error
      if (lastResult && error instanceof PhotoAnalysisError) {
        return {
          success: false,
          data: lastResult,
          error: error,
          attempts,
          totalTime: Date.now() - startTime
        };
      }

      return {
        success: false,
        error: error instanceof AppError ? error : new PhotoAnalysisError('Photo analysis failed after retries'),
        attempts,
        totalTime: Date.now() - startTime
      };
    }
  }

  // Retry general AI operations
  static async retryAIOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    config: Partial<RetryConfig> = {}
  ): Promise<AIOperationResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let attempts = 0;

    try {
      const result = await RetryManager.withRetry(
        async () => {
          attempts++;
          return await operation();
        },
        {
          maxRetries: finalConfig.maxRetries,
          baseDelay: finalConfig.baseDelay,
          maxDelay: finalConfig.maxDelay,
          shouldRetry: (error: Error, attempt: number) => {
            // Retry on AI service errors
            if (error instanceof AIServiceError) {
              return attempt < finalConfig.maxRetries;
            }
            return false;
          },
          onRetry: (error: Error, attempt: number) => {
            console.warn(`${operationType} retry attempt ${attempt}:`, error.message);
          }
        }
      );

      return {
        success: true,
        data: result,
        attempts,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AppError ? error : new AIServiceError(`${operationType} failed after retries`),
        attempts,
        totalTime: Date.now() - startTime
      };
    }
  }

  // Circuit breaker for AI services
  private static circuitBreakerState: Map<string, {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
  }> = new Map();

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceKey: string,
    failureThreshold: number = 5,
    timeoutMs: number = 60000
  ): Promise<T> {
    const state = this.circuitBreakerState.get(serviceKey) || {
      failures: 0,
      lastFailure: 0,
      isOpen: false
    };

    // Check if circuit breaker is open
    if (state.isOpen) {
      const timeSinceLastFailure = Date.now() - state.lastFailure;
      if (timeSinceLastFailure < timeoutMs) {
        throw new AIServiceError(`Service ${serviceKey} is temporarily unavailable`);
      } else {
        // Reset circuit breaker
        state.isOpen = false;
        state.failures = 0;
      }
    }

    try {
      const result = await operation();
      
      // Reset failure count on success
      if (state.failures > 0) {
        state.failures = 0;
        this.circuitBreakerState.set(serviceKey, state);
      }
      
      return result;
    } catch (error) {
      state.failures++;
      state.lastFailure = Date.now();
      
      if (state.failures >= failureThreshold) {
        state.isOpen = true;
      }
      
      this.circuitBreakerState.set(serviceKey, state);
      throw error;
    }
  }
}

// Fallback strategies for different operations
export class FallbackService {
  // Fallback for conversation failures - structured questionnaire
  static getStructuredQuestionnaireData() {
    return {
      emotions: [
        { id: 'confident', label: 'Confident', description: 'I want to feel powerful and self-assured' },
        { id: 'comfortable', label: 'Comfortable', description: 'I prioritize ease and comfort in my clothing' },
        { id: 'creative', label: 'Creative', description: 'I like to express my artistic side through fashion' },
        { id: 'professional', label: 'Professional', description: 'I want to look polished and competent' },
        { id: 'romantic', label: 'Romantic', description: 'I enjoy feminine and soft styling' }
      ],
      archetype: [
        { id: 'classic', label: 'The Classic', description: 'Timeless, elegant, refined style' },
        { id: 'creative', label: 'The Creator', description: 'Artistic, experimental, unique expression' },
        { id: 'professional', label: 'The Professional', description: 'Polished, competent, authoritative' },
        { id: 'casual', label: 'The Casual', description: 'Relaxed, comfortable, effortless' },
        { id: 'trendy', label: 'The Trendsetter', description: 'Fashion-forward, bold, current' }
      ],
      essence: [
        { id: 'classic', label: 'Classic', description: 'Clean lines, timeless pieces, structured silhouettes' },
        { id: 'romantic', label: 'Romantic', description: 'Soft fabrics, flowing lines, feminine details' },
        { id: 'dramatic', label: 'Dramatic', description: 'Bold statements, sharp lines, high contrast' },
        { id: 'natural', label: 'Natural', description: 'Relaxed fit, organic textures, earthy tones' },
        { id: 'gamine', label: 'Gamine', description: 'Playful mix, unexpected combinations, youthful energy' }
      ]
    };
  }

  // Fallback for photo analysis - manual input options
  static getManualInputOptions() {
    return {
      bodyShape: [
        { id: 'pear', label: 'Pear/Triangle', description: 'Hips wider than shoulders' },
        { id: 'apple', label: 'Apple/Round', description: 'Fuller midsection' },
        { id: 'hourglass', label: 'Hourglass', description: 'Balanced shoulders and hips with defined waist' },
        { id: 'rectangle', label: 'Rectangle/Straight', description: 'Similar measurements throughout' },
        { id: 'inverted_triangle', label: 'Inverted Triangle', description: 'Shoulders wider than hips' }
      ],
      colorPalette: [
        { id: 'spring', label: 'Spring', description: 'Warm, bright, clear colors' },
        { id: 'summer', label: 'Summer', description: 'Cool, soft, muted colors' },
        { id: 'autumn', label: 'Autumn', description: 'Warm, rich, earthy colors' },
        { id: 'winter', label: 'Winter', description: 'Cool, clear, contrasting colors' }
      ]
    };
  }
}