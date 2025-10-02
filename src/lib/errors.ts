// Error handling utilities and types

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId: string;
    retryable?: boolean;
    retryAfter?: number;
    recoveryActions?: RecoveryAction[];
  };
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual' | 'session_recovery';
  label: string;
  description: string;
  endpoint?: string;
  params?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly recoveryActions: RecoveryAction[];

  constructor(
    code: string, 
    message: string, 
    statusCode: number = 500, 
    details?: unknown,
    retryable: boolean = false,
    retryAfter?: number,
    recoveryActions: RecoveryAction[] = []
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
    this.recoveryActions = recoveryActions;
    this.name = 'AppError';
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, details?: unknown, retryable: boolean = true) {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'retry',
        label: 'Try Again',
        description: 'Retry the AI analysis with the same input'
      }
    ];

    if (message.toLowerCase().includes('conversation') || message.toLowerCase().includes('chat')) {
      recoveryActions.push({
        type: 'fallback',
        label: 'Use Structured Form',
        description: 'Complete your profile using a structured questionnaire instead'
      });
    }

    super('AI_SERVICE_ERROR', message, 502, details, retryable, 5000, recoveryActions);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'retry',
        label: 'Retry',
        description: 'Try the operation again'
      }
    ];

    super('DATABASE_ERROR', message, 500, details, true, 2000, recoveryActions);
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'retry',
        label: 'Retry Upload',
        description: 'Try uploading the image again'
      },
      {
        type: 'manual',
        label: 'Try Different Image',
        description: 'Select a different image or check your internet connection'
      }
    ];

    super('STORAGE_ERROR', message, 500, details, true, 3000, recoveryActions);
  }
}

export class SessionExpiredError extends AppError {
  constructor(sessionType: string = 'session') {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'session_recovery',
        label: 'Resume Session',
        description: `Recover your ${sessionType} and continue where you left off`
      },
      {
        type: 'retry',
        label: 'Start Over',
        description: `Start a new ${sessionType} from the beginning`
      }
    ];

    super('SESSION_EXPIRED', `Your ${sessionType} has expired`, 401, undefined, false, undefined, recoveryActions);
  }
}

export class PhotoAnalysisError extends AppError {
  constructor(message: string, confidence?: number, details?: unknown) {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'retry',
        label: 'Retry Analysis',
        description: 'Try analyzing the same photo again'
      },
      {
        type: 'manual',
        label: 'Upload Different Photo',
        description: 'Try a different photo with better lighting or angle'
      }
    ];

    if (confidence !== undefined && confidence < 0.7) {
      recoveryActions.push({
        type: 'manual',
        label: 'Manual Input',
        description: 'Provide your measurements manually instead'
      });
    }

    super('PHOTO_ANALYSIS_ERROR', message, 422, details, true, 3000, recoveryActions);
  }
}

export class ConversationError extends AppError {
  constructor(message: string, details?: unknown) {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'retry',
        label: 'Try Again',
        description: 'Send your message again'
      },
      {
        type: 'fallback',
        label: 'Use Structured Form',
        description: 'Complete your profile using a questionnaire instead'
      },
      {
        type: 'session_recovery',
        label: 'Resume Previous Session',
        description: 'Continue from your last saved conversation'
      }
    ];

    super('CONVERSATION_ERROR', message, 500, details, true, 2000, recoveryActions);
  }
}

// Error response formatter
export function formatErrorResponse(error: Error, requestId: string): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
        recoveryActions: error.recoveryActions,
      },
    };
  }

  // Generic error handling
  return {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId,
      retryable: true,
      retryAfter: 5000,
      recoveryActions: [
        {
          type: 'retry',
          label: 'Try Again',
          description: 'Retry the operation'
        }
      ],
    },
  };
}

// Generate unique request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Retry mechanism with exponential backoff
export class RetryManager {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BASE_DELAY = 1000;
  private static readonly DEFAULT_MAX_DELAY = 10000;

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      shouldRetry?: (error: Error, attempt: number) => boolean;
      onRetry?: (error: Error, attempt: number) => void;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = this.DEFAULT_MAX_RETRIES,
      baseDelay = this.DEFAULT_BASE_DELAY,
      maxDelay = this.DEFAULT_MAX_DELAY,
      shouldRetry = (error: Error) => error instanceof AppError && error.retryable,
      onRetry
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries || !shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// Session recovery utilities
export interface SessionRecoveryData {
  sessionId: string;
  userId: string;
  sessionType: 'onboarding' | 'analysis';
  lastActivity: string;
  recoveryData: Record<string, unknown>;
}

export class SessionRecoveryManager {
  static async saveRecoveryData(data: SessionRecoveryData): Promise<void> {
    try {
      const key = `session_recovery_${data.userId}_${data.sessionType}`;
      localStorage.setItem(key, JSON.stringify({
        ...data,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to save session recovery data:', error);
    }
  }

  static async getRecoveryData(userId: string, sessionType: string): Promise<SessionRecoveryData | null> {
    try {
      const key = `session_recovery_${userId}_${sessionType}`;
      const data = localStorage.getItem(key);
      
      if (!data) return null;

      const parsed = JSON.parse(data);
      const savedAt = new Date(parsed.savedAt);
      const now = new Date();
      
      // Recovery data expires after 24 hours
      if (now.getTime() - savedAt.getTime() > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('Failed to get session recovery data:', error);
      return null;
    }
  }

  static async clearRecoveryData(userId: string, sessionType: string): Promise<void> {
    try {
      const key = `session_recovery_${userId}_${sessionType}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear session recovery data:', error);
    }
  }
}

// User-friendly error messages
export function getUserFriendlyMessage(error: AppError): string {
  const messageMap: Record<string, string> = {
    'AI_SERVICE_ERROR': 'Our AI is having trouble right now. Please try again in a moment.',
    'DATABASE_ERROR': 'We\'re having trouble saving your data. Please try again.',
    'STORAGE_ERROR': 'There was a problem uploading your image. Please check your connection and try again.',
    'PHOTO_ANALYSIS_ERROR': 'We couldn\'t analyze your photo clearly. Try a different photo with better lighting.',
    'CONVERSATION_ERROR': 'There was a problem with the conversation. You can try again or use our questionnaire instead.',
    'SESSION_EXPIRED': 'Your session has expired, but we can help you pick up where you left off.',
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'AUTHENTICATION_ERROR': 'Please sign in to continue.',
    'AUTHORIZATION_ERROR': 'You don\'t have permission to access this.',
    'NOT_FOUND': 'We couldn\'t find what you\'re looking for.'
  };

  return messageMap[error.code] || 'Something went wrong. Please try again.';
}