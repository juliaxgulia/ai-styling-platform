/**
 * Test Utilities and Helpers for Comprehensive Testing
 * Shared utilities for E2E, integration, performance, security, and load tests
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Test configuration constants
export const TEST_CONFIG = {
  JWT_SECRET: 'test-secret-key-for-testing',
  AWS_REGION: 'us-east-1',
  S3_BUCKET: 'test-bucket',
  DYNAMODB_TABLE: 'test-table',
  PERFORMANCE_THRESHOLDS: {
    CHAT_RESPONSE: 3000,
    IMAGE_ANALYSIS: 10000,
    PROFILE_GENERATION: 5000,
    UPLOAD_URL: 1000,
  },
  LOAD_LEVELS: {
    LIGHT: 10,
    MEDIUM: 25,
    HEAVY: 50,
    STRESS: 100,
  }
};

// Mock data generators
export class MockDataGenerator {
  static generateUserId(prefix: string = 'test-user'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateEmail(userId: string): string {
    return `${userId}@test.com`;
  }

  static generateJWT(userId: string, expiresIn: string = '1h'): string {
    return jwt.sign({ userId }, TEST_CONFIG.JWT_SECRET, { expiresIn });
  }

  static generateExpiredJWT(userId: string): string {
    return jwt.sign(
      { userId, exp: Math.floor(Date.now() / 1000) - 3600 },
      TEST_CONFIG.JWT_SECRET
    );
  }

  static generateStyleProfile() {
    return {
      emotions: ['Confident', 'Powerful', 'Elegant'],
      archetype: ['The Ruler'],
      essence: ['Classic'],
      lifestyle: ['Professional'],
      values: ['High Quality', 'Sustainable']
    };
  }

  static generatePhysicalProfile() {
    return {
      bodyShape: 'middle_balance',
      bodyShapeConfidence: 0.85,
      colorPalette: {
        season: 'True Winter',
        colors: ['#000000', '#FFFFFF', '#FF0000', '#0000FF'],
        skinTone: 'Cool',
        hairColor: 'Dark Brown',
        eyeColor: 'Brown',
        confidence: 0.92
      }
    };
  }

  static generatePreferences() {
    return {
      zipCode: '10001',
      maxBudget: 200
    };
  }
}

// Request builders
export class RequestBuilder {
  static createAuthenticatedRequest(
    url: string,
    method: string,
    body: any,
    token: string
  ): NextRequest {
    return new NextRequest(url, {
      method,
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }

  static createUnauthenticatedRequest(
    url: string,
    method: string,
    body: any
  ): NextRequest {
    return new NextRequest(url, {
      method,
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  static createRegistrationRequest(email: string, password: string): NextRequest {
    return this.createUnauthenticatedRequest(
      'http://localhost:3000/api/auth/register',
      'POST',
      { email, password }
    );
  }

  static createLoginRequest(email: string, password: string): NextRequest {
    return this.createUnauthenticatedRequest(
      'http://localhost:3000/api/auth/login',
      'POST',
      { email, password }
    );
  }

  static createOnboardingChatRequest(
    message: string,
    userId: string,
    sessionId: string,
    token: string
  ): NextRequest {
    return this.createAuthenticatedRequest(
      'http://localhost:3000/api/chat/onboarding',
      'POST',
      { message, userId, sessionId },
      token
    );
  }

  static createUploadUrlRequest(
    userId: string,
    analysisType: string,
    fileType: string,
    token: string
  ): NextRequest {
    return this.createAuthenticatedRequest(
      'http://localhost:3000/api/analysis/upload-url',
      'POST',
      { userId, analysisType, fileType },
      token
    );
  }

  static createBodyShapeAnalysisRequest(
    userId: string,
    imageKey: string,
    token: string
  ): NextRequest {
    return this.createAuthenticatedRequest(
      'http://localhost:3000/api/analysis/body-shape',
      'POST',
      { userId, imageKey },
      token
    );
  }

  static createColorPaletteAnalysisRequest(
    userId: string,
    imageKey: string,
    token: string
  ): NextRequest {
    return this.createAuthenticatedRequest(
      'http://localhost:3000/api/analysis/color-palette',
      'POST',
      { userId, imageKey },
      token
    );
  }
}

// Performance measurement utilities
export class PerformanceMonitor {
  private startTime: number = 0;
  private measurements: { [key: string]: number[] } = {};

  start(): void {
    this.startTime = Date.now();
  }

  end(operationName: string): number {
    const duration = Date.now() - this.startTime;
    if (!this.measurements[operationName]) {
      this.measurements[operationName] = [];
    }
    this.measurements[operationName].push(duration);
    return duration;
  }

  getAverageTime(operationName: string): number {
    const times = this.measurements[operationName] || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMaxTime(operationName: string): number {
    const times = this.measurements[operationName] || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }

  getMinTime(operationName: string): number {
    const times = this.measurements[operationName] || [];
    return times.length > 0 ? Math.min(...times) : 0;
  }

  reset(): void {
    this.measurements = {};
  }

  getSummary(): { [key: string]: { avg: number; max: number; min: number; count: number } } {
    const summary: any = {};
    Object.keys(this.measurements).forEach(operation => {
      const times = this.measurements[operation];
      summary[operation] = {
        avg: this.getAverageTime(operation),
        max: this.getMaxTime(operation),
        min: this.getMinTime(operation),
        count: times.length
      };
    });
    return summary;
  }
}

// Load testing utilities
export class LoadTestRunner {
  static async runConcurrentRequests<T>(
    requestFactory: () => Promise<T>,
    concurrency: number,
    description: string
  ): Promise<{ results: T[]; duration: number; successRate: number }> {
    const promises = Array.from({ length: concurrency }, () => requestFactory());
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(result => result.status === 'fulfilled');
    const successRate = successful.length / results.length;
    
    console.log(`${description}: ${concurrency} requests in ${duration}ms, Success rate: ${(successRate * 100).toFixed(1)}%`);
    
    return {
      results: successful.map(result => (result as PromiseFulfilledResult<T>).value),
      duration,
      successRate
    };
  }

  static async runBatchedRequests<T>(
    requestFactory: (batchIndex: number, itemIndex: number) => Promise<T>,
    batchSize: number,
    batchCount: number,
    delayBetweenBatches: number = 0
  ): Promise<T[][]> {
    const results: T[][] = [];
    
    for (let batch = 0; batch < batchCount; batch++) {
      const batchPromises = Array.from({ length: batchSize }, (_, i) => 
        requestFactory(batch, i)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(batchResults);
      
      if (delayBetweenBatches > 0 && batch < batchCount - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
}

// Security testing utilities
export class SecurityTestHelper {
  static readonly MALICIOUS_INPUTS = {
    XSS: [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '"><script>alert(1)</script>'
    ],
    SQL_INJECTION: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ],
    PATH_TRAVERSAL: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'body-shape/../../../sensitive-data.txt',
      'body-shape/user/../../../admin/secrets.json'
    ],
    TEMPLATE_INJECTION: [
      '${process.env.JWT_SECRET}',
      '{{constructor.constructor("return process")().env}}',
      '#{7*7}',
      '${{7*7}}'
    ]
  };

  static readonly INVALID_FILE_TYPES = [
    'application/javascript',
    'text/html',
    'application/x-executable',
    'application/octet-stream',
    'text/plain'
  ];

  static validateNoSensitiveDataInResponse(responseData: any): void {
    const responseString = JSON.stringify(responseData);
    
    // Check for common sensitive data patterns
    expect(responseString).not.toMatch(/AWS_ACCESS_KEY/i);
    expect(responseString).not.toMatch(/JWT_SECRET/i);
    expect(responseString).not.toMatch(/password/i);
    expect(responseString).not.toMatch(/secret/i);
    expect(responseString).not.toMatch(/private.*key/i);
  }

  static validateInputSanitization(input: string, output: any): void {
    const outputString = JSON.stringify(output);
    
    // Ensure malicious scripts are not present in output
    expect(outputString).not.toMatch(/<script>/i);
    expect(outputString).not.toMatch(/javascript:/i);
    expect(outputString).not.toMatch(/\$\{/);
    expect(outputString).not.toMatch(/\{\{/);
    expect(outputString).not.toMatch(/onerror=/i);
  }
}

// Memory monitoring utilities
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage;
  private snapshots: { timestamp: number; memory: NodeJS.MemoryUsage }[] = [];

  constructor() {
    this.initialMemory = process.memoryUsage();
  }

  takeSnapshot(label?: string): void {
    const memory = process.memoryUsage();
    this.snapshots.push({
      timestamp: Date.now(),
      memory
    });
    
    if (label) {
      console.log(`Memory snapshot (${label}): ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  getMemoryIncrease(): number {
    const currentMemory = process.memoryUsage();
    return currentMemory.heapUsed - this.initialMemory.heapUsed;
  }

  validateMemoryUsage(maxIncreaseBytes: number): void {
    const increase = this.getMemoryIncrease();
    expect(increase).toBeLessThan(maxIncreaseBytes);
  }

  getReport(): {
    initial: NodeJS.MemoryUsage;
    current: NodeJS.MemoryUsage;
    increase: number;
    snapshots: number;
  } {
    const current = process.memoryUsage();
    return {
      initial: this.initialMemory,
      current,
      increase: this.getMemoryIncrease(),
      snapshots: this.snapshots.length
    };
  }
}

// Test data validation utilities
export class ValidationHelper {
  static validateStyleProfile(profile: any): void {
    expect(profile).toBeDefined();
    expect(profile.emotions).toBeDefined();
    expect(Array.isArray(profile.emotions)).toBe(true);
    expect(profile.archetype).toBeDefined();
    expect(Array.isArray(profile.archetype)).toBe(true);
    expect(profile.essence).toBeDefined();
    expect(Array.isArray(profile.essence)).toBe(true);
    expect(profile.lifestyle).toBeDefined();
    expect(Array.isArray(profile.lifestyle)).toBe(true);
    expect(profile.values).toBeDefined();
    expect(Array.isArray(profile.values)).toBe(true);
  }

  static validatePhysicalProfile(profile: any): void {
    expect(profile).toBeDefined();
    
    if (profile.bodyShape) {
      const validBodyShapes = [
        'middle_balance', 'lower_balance', 'waist_balance',
        'upper_balance', 'equal_balance'
      ];
      expect(validBodyShapes).toContain(profile.bodyShape);
    }
    
    if (profile.colorPalette) {
      expect(profile.colorPalette.season).toBeDefined();
      expect(profile.colorPalette.colors).toBeDefined();
      expect(Array.isArray(profile.colorPalette.colors)).toBe(true);
    }
  }

  static validateApiResponse(response: Response, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
  }

  static validateErrorResponse(response: Response, expectedStatus: number): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.status).toBeGreaterThanOrEqual(400);
  }
}

// Custom Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}

// Extend Jest matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
  
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${min} - ${max}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${min} - ${max}`,
        pass: false,
      };
    }
  },
});