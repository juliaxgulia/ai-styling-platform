/**
 * Security Tests for Photo Storage and Profile Data Protection
 * Tests authentication, authorization, data encryption, and privacy controls
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Mock AWS services
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@aws-sdk/client-dynamodb');

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.DYNAMODB_TABLE_NAME = 'test-table';
process.env.JWT_SECRET = 'test-secret-key-for-security-testing';

describe('Security Tests for Data Protection', () => {
  const validUserId = 'security-test-user';
  const maliciousUserId = 'malicious-user';
  const validToken = jwt.sign({ userId: validUserId }, process.env.JWT_SECRET!);
  const invalidToken = 'invalid.jwt.token';
  const expiredToken = jwt.sign({ userId: validUserId, exp: Math.floor(Date.now() / 1000) - 3600 }, process.env.JWT_SECRET!);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          analysisType: 'body-shape',
          fileType: 'image/jpeg'
        }),
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid JWT tokens', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          analysisType: 'body-shape',
          fileType: 'image/jpeg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${invalidToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });

    it('should reject requests with expired JWT tokens', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          analysisType: 'body-shape',
          fileType: 'image/jpeg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expiredToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });

    it('should validate JWT signature integrity', async () => {
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          analysisType: 'body-shape',
          fileType: 'image/jpeg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tamperedToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent users from accessing other users\' data', async () => {
      const { GET } = await import('../../src/app/api/users/profile/route');
      
      const request = new NextRequest(`http://localhost:3000/api/users/profile?userId=${maliciousUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}` // Valid token but for different user
        }
      });

      const response = await GET(request);
      
      expect(response.status).toBe(403);
    });

    it('should prevent unauthorized photo analysis access', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: maliciousUserId, // Different user ID
          imageKey: 'body-shape/security-test-user/private-image.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(403);
    });

    it('should validate user ownership of image keys', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          imageKey: 'body-shape/other-user/stolen-image.jpg' // Image belonging to different user
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent path traversal attacks in image keys', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const maliciousImageKeys = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'body-shape/../../../sensitive-data.txt',
        'body-shape/user/../../../admin/secrets.json'
      ];

      for (const imageKey of maliciousImageKeys) {
        const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
          method: 'POST',
          body: JSON.stringify({
            userId: validUserId,
            imageKey: imageKey
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validToken}`
          }
        });

        const response = await POST(request);
        
        expect(response.status).toBe(400);
      }
    });

    it('should validate file type restrictions', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const maliciousFileTypes = [
        'application/javascript',
        'text/html',
        'application/x-executable',
        'application/octet-stream',
        'text/plain'
      ];

      for (const fileType of maliciousFileTypes) {
        const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
          method: 'POST',
          body: JSON.stringify({
            userId: validUserId,
            analysisType: 'body-shape',
            fileType: fileType
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validToken}`
          }
        });

        const response = await POST(request);
        
        expect(response.status).toBe(400);
      }
    });

    it('should sanitize user input in profile data', async () => {
      const { POST } = await import('../../src/app/api/profile/review/route');
      
      const maliciousInputs = {
        styleProfile: {
          emotions: ['<script>alert("xss")</script>', 'Confident'],
          archetype: ['javascript:alert(1)', 'The Ruler'],
          essence: ['${process.env.JWT_SECRET}', 'Classic'],
          lifestyle: ['{{constructor.constructor("return process")().env}}', 'Professional'],
          values: ['<img src=x onerror=alert(1)>', 'Sustainable']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/profile/review', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          updates: maliciousInputs
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      
      // Should either reject malicious input or sanitize it
      expect(response.status).toBeOneOf([200, 400]);
      
      if (response.status === 200) {
        const data = await response.json();
        // Verify that malicious scripts are not stored
        expect(JSON.stringify(data)).not.toMatch(/<script>/);
        expect(JSON.stringify(data)).not.toMatch(/javascript:/);
        expect(JSON.stringify(data)).not.toMatch(/\$\{/);
        expect(JSON.stringify(data)).not.toMatch(/\{\{/);
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const { POST } = await import('../../src/app/api/chat/onboarding/route');
      
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            message: maliciousInput,
            userId: validUserId,
            sessionId: 'security-test-session'
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validToken}`
          }
        });

        const response = await POST(request);
        
        // Should handle malicious input gracefully
        expect(response.status).toBeOneOf([200, 400]);
      }
    });
  });

  describe('Data Privacy and Encryption', () => {
    it('should not expose sensitive data in error messages', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          imageKey: 'non-existent-image.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();
      
      // Error messages should not contain sensitive information
      expect(JSON.stringify(data)).not.toMatch(/AWS_ACCESS_KEY/);
      expect(JSON.stringify(data)).not.toMatch(/JWT_SECRET/);
      expect(JSON.stringify(data)).not.toMatch(/password/i);
      expect(JSON.stringify(data)).not.toMatch(/secret/i);
    });

    it('should implement proper CORS headers', async () => {
      const { POST } = await import('../../src/app/api/auth/login/route');
      
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        }
      });

      const response = await POST(request);
      
      // Should have proper CORS configuration
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      expect(corsHeader).not.toBe('*'); // Should not allow all origins
    });

    it('should implement rate limiting protection', async () => {
      const { POST } = await import('../../src/app/api/auth/login/route');
      
      const rapidRequests = Array.from({ length: 20 }, () => {
        return new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrong-password'
          }),
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.100' // Simulate same IP
          }
        });
      });

      const responses = await Promise.all(rapidRequests.map(req => POST(req)));
      
      // Should implement rate limiting after multiple failed attempts
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('S3 Security', () => {
    it('should generate secure signed URLs with expiration', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          analysisType: 'body-shape',
          fileType: 'image/jpeg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
      
      // URL should contain expiration parameters
      expect(data.uploadUrl).toMatch(/X-Amz-Expires/);
      expect(data.uploadUrl).toMatch(/X-Amz-Signature/);
    });

    it('should enforce user-specific S3 key prefixes', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          analysisType: 'body-shape',
          fileType: 'image/jpeg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.imageKey).toMatch(new RegExp(`^body-shape/${validUserId}/`));
    });

    it('should prevent access to other users\' S3 objects', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const otherUserImageKey = `body-shape/${maliciousUserId}/private-image.jpg`;
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: validUserId,
          imageKey: otherUserImageKey
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(403);
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      const { POST: logoutPost } = await import('../../src/app/api/auth/logout/route');
      
      const logoutRequest = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      const logoutResponse = await logoutPost(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      // Try to use the token after logout
      const { GET } = await import('../../src/app/api/users/profile/route');
      
      const profileRequest = new NextRequest(`http://localhost:3000/api/users/profile?userId=${validUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      const profileResponse = await GET(profileRequest);
      
      // Should be unauthorized after logout
      expect(profileResponse.status).toBe(401);
    });

    it('should implement secure session storage', async () => {
      const { POST } = await import('../../src/app/api/chat/onboarding/route');
      
      const request = new NextRequest('http://localhost:3000/api/chat/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          message: "Test message for session security",
          userId: validUserId,
          sessionId: 'security-test-session'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      
      // Session data should not contain sensitive information in plain text
      expect(JSON.stringify(data)).not.toMatch(/password/i);
      expect(JSON.stringify(data)).not.toMatch(/secret/i);
      expect(JSON.stringify(data)).not.toMatch(/key/i);
    });
  });
});