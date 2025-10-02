/**
 * Performance Tests for AI Response Times and Image Processing
 * Tests response times, throughput, and resource usage
 */

import { NextRequest } from 'next/server';

// Mock AWS services
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-s3');

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.JWT_SECRET = 'test-secret';

describe('AI Performance Tests', () => {
  const userId = 'perf-test-user';
  const authToken = 'mock-jwt-token';

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    ONBOARDING_CHAT_RESPONSE: 3000,    // 3 seconds
    BODY_SHAPE_ANALYSIS: 10000,        // 10 seconds
    COLOR_PALETTE_ANALYSIS: 8000,      // 8 seconds
    PROFILE_GENERATION: 5000,          // 5 seconds
    UPLOAD_URL_GENERATION: 1000,       // 1 second
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conversational AI Performance', () => {
    it('should respond to onboarding chat within performance threshold', async () => {
      const { POST } = await import('../../src/app/api/chat/onboarding/route');
      
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          message: "I want to feel confident and powerful in my clothes",
          userId: userId,
          sessionId: 'perf-test-session'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ONBOARDING_CHAT_RESPONSE);
      
      console.log(`Onboarding chat response time: ${responseTime}ms`);
    });

    it('should handle multiple concurrent chat requests efficiently', async () => {
      const { POST } = await import('../../src/app/api/chat/onboarding/route');
      
      const concurrentRequests = 5;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        return new NextRequest('http://localhost:3000/api/chat/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            message: `Test message ${i}`,
            userId: `${userId}-${i}`,
            sessionId: `perf-test-session-${i}`
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle concurrent requests without significant degradation
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ONBOARDING_CHAT_RESPONSE * 2);
      
      console.log(`Concurrent chat requests (${concurrentRequests}) total time: ${totalTime}ms`);
    });

    it('should generate complete profile within performance threshold', async () => {
      const { POST } = await import('../../src/app/api/chat/complete-profile/route');
      
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          sessionId: 'perf-test-session'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_GENERATION);
      
      console.log(`Profile generation time: ${responseTime}ms`);
    });
  });

  describe('Image Analysis Performance', () => {
    it('should analyze body shape within performance threshold', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: 'body-shape/test-user/performance-test.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BODY_SHAPE_ANALYSIS);
      
      console.log(`Body shape analysis time: ${responseTime}ms`);
    });

    it('should analyze color palette within performance threshold', async () => {
      const { POST } = await import('../../src/app/api/analysis/color-palette/route');
      
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/analysis/color-palette', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: 'color-palette/test-user/performance-test.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COLOR_PALETTE_ANALYSIS);
      
      console.log(`Color palette analysis time: ${responseTime}ms`);
    });

    it('should handle concurrent image analysis requests', async () => {
      const { POST: bodyShapePost } = await import('../../src/app/api/analysis/body-shape/route');
      const { POST: colorPalettePost } = await import('../../src/app/api/analysis/color-palette/route');
      
      const concurrentRequests = 3;
      const bodyShapeRequests = Array.from({ length: concurrentRequests }, (_, i) => {
        return bodyShapePost(new NextRequest('http://localhost:3000/api/analysis/body-shape', {
          method: 'POST',
          body: JSON.stringify({
            userId: `${userId}-body-${i}`,
            imageKey: `body-shape/test-user/concurrent-${i}.jpg`
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }));
      });

      const colorPaletteRequests = Array.from({ length: concurrentRequests }, (_, i) => {
        return colorPalettePost(new NextRequest('http://localhost:3000/api/analysis/color-palette', {
          method: 'POST',
          body: JSON.stringify({
            userId: `${userId}-color-${i}`,
            imageKey: `color-palette/test-user/concurrent-${i}.jpg`
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }));
      });

      const startTime = Date.now();
      const allResponses = await Promise.all([...bodyShapeRequests, ...colorPaletteRequests]);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      allResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle concurrent analysis without excessive delay
      expect(totalTime).toBeLessThan(Math.max(
        PERFORMANCE_THRESHOLDS.BODY_SHAPE_ANALYSIS,
        PERFORMANCE_THRESHOLDS.COLOR_PALETTE_ANALYSIS
      ) * 1.5);
      
      console.log(`Concurrent image analysis (${concurrentRequests * 2}) total time: ${totalTime}ms`);
    });
  });

  describe('Upload URL Generation Performance', () => {
    it('should generate upload URLs quickly', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          analysisType: 'body-shape',
          fileType: 'image/jpeg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UPLOAD_URL_GENERATION);
      
      console.log(`Upload URL generation time: ${responseTime}ms`);
    });

    it('should handle burst upload URL requests', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const burstSize = 10;
      const requests = Array.from({ length: burstSize }, (_, i) => {
        return new NextRequest('http://localhost:3000/api/analysis/upload-url', {
          method: 'POST',
          body: JSON.stringify({
            userId: `${userId}-${i}`,
            analysisType: i % 2 === 0 ? 'body-shape' : 'color-palette',
            fileType: 'image/jpeg'
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle burst requests efficiently
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UPLOAD_URL_GENERATION * 3);
      
      console.log(`Burst upload URL requests (${burstSize}) total time: ${totalTime}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      const { POST } = await import('../../src/app/api/chat/onboarding/route');
      
      const initialMemory = process.memoryUsage();
      
      // Perform repeated operations
      for (let i = 0; i < 50; i++) {
        const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            message: `Memory test message ${i}`,
            userId: `${userId}-memory-${i}`,
            sessionId: `memory-test-session-${i}`
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });

        await POST(request);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase after 50 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across test runs', async () => {
      const { POST } = await import('../../src/app/api/chat/onboarding/route');
      
      const testRuns = 5;
      const responseTimes: number[] = [];

      for (let i = 0; i < testRuns; i++) {
        const startTime = Date.now();
        
        const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            message: `Regression test message ${i}`,
            userId: `${userId}-regression-${i}`,
            sessionId: `regression-test-session-${i}`
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });

        const response = await POST(request);
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        responseTimes.push(endTime - startTime);
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      const variance = maxTime - minTime;

      // Performance should be consistent (variance less than 50% of average)
      expect(variance).toBeLessThan(averageTime * 0.5);
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ONBOARDING_CHAT_RESPONSE);
      
      console.log(`Performance consistency - Avg: ${averageTime.toFixed(2)}ms, Variance: ${variance.toFixed(2)}ms`);
    });
  });
});