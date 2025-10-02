/**
 * Monitoring and logging utilities for production environment
 */

export interface LogEvent {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface AIInteractionLog extends LogEvent {
  type: 'ai_interaction';
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latency: number;
  confidence?: number;
  success: boolean;
}

export interface ErrorLog extends LogEvent {
  type: 'error';
  errorCode: string;
  stack?: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatLog(event: LogEvent): string {
    return JSON.stringify({
      ...event,
      environment: process.env.NODE_ENV,
      service: 'ai-styling-platform'
    });
  }

  info(message: string, metadata?: Record<string, any>, userId?: string): void {
    const event: LogEvent = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      userId,
      metadata
    };
    
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, metadata);
    } else {
      console.log(this.formatLog(event));
    }
  }

  warn(message: string, metadata?: Record<string, any>, userId?: string): void {
    const event: LogEvent = {
      level: 'warn', 
      message,
      timestamp: new Date().toISOString(),
      userId,
      metadata
    };
    
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, metadata);
    } else {
      console.warn(this.formatLog(event));
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, any>, userId?: string): void {
    const errorLog: ErrorLog = {
      type: 'error',
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      userId,
      errorCode: error?.name || 'UnknownError',
      stack: error?.stack,
      metadata
    };
    
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, metadata);
    } else {
      console.error(this.formatLog(errorLog));
    }
  }

  aiInteraction(params: {
    model: string;
    success: boolean;
    latency: number;
    inputTokens?: number;
    outputTokens?: number;
    confidence?: number;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): void {
    const log: AIInteractionLog = {
      type: 'ai_interaction',
      level: params.success ? 'info' : 'error',
      message: `AI interaction with ${params.model}`,
      timestamp: new Date().toISOString(),
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      latency: params.latency,
      confidence: params.confidence,
      success: params.success,
      userId: params.userId,
      sessionId: params.sessionId,
      metadata: params.metadata
    };

    if (this.isDevelopment) {
      console.log(`[AI] ${params.model} - ${params.success ? 'SUCCESS' : 'FAILED'} (${params.latency}ms)`, params.metadata);
    } else {
      console.log(this.formatLog(log));
    }
  }
}

export const logger = new Logger();

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static start(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  static end(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      logger.warn(`Performance timer not found for operation: ${operation}`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(operation);
    
    logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      operation,
      duration
    });
    
    return duration;
  }

  static measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.start(operation);
      try {
        const result = await fn();
        this.end(operation);
        resolve(result);
      } catch (error) {
        this.end(operation);
        reject(error);
      }
    });
  }
}

/**
 * Error tracking and alerting
 */
export class ErrorTracker {
  static track(error: Error, context?: {
    userId?: string;
    operation?: string;
    metadata?: Record<string, any>;
  }): void {
    logger.error(
      `Error in ${context?.operation || 'unknown operation'}`,
      error,
      context?.metadata,
      context?.userId
    );

    // In production, you might want to send to external monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, DataDog, etc.
      // Sentry.captureException(error, { user: { id: context?.userId }, extra: context?.metadata });
    }
  }

  static trackAIError(params: {
    model: string;
    error: Error;
    userId?: string;
    sessionId?: string;
    inputData?: any;
  }): void {
    logger.error(
      `AI Model Error: ${params.model}`,
      params.error,
      {
        model: params.model,
        sessionId: params.sessionId,
        inputDataType: typeof params.inputData,
        hasInputData: !!params.inputData
      },
      params.userId
    );
  }
}

/**
 * Health check utilities
 */
export class HealthChecker {
  static async checkAWSServices(): Promise<{
    dynamodb: boolean;
    s3: boolean;
    bedrock: boolean;
  }> {
    const results = {
      dynamodb: false,
      s3: false,
      bedrock: false
    };

    try {
      // These would be actual health checks in production
      // For now, just check if environment variables are set
      results.dynamodb = !!process.env.DYNAMODB_TABLE_NAME;
      results.s3 = !!process.env.S3_BUCKET_NAME;
      results.bedrock = !!process.env.AWS_REGION;
      
      logger.info('Health check completed', results);
    } catch (error) {
      logger.error('Health check failed', error as Error, results);
    }

    return results;
  }
}