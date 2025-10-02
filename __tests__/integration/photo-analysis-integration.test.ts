/**
 * Integration Tests for Photo Analysis Workflow
 * Tests the complete photo upload, analysis, and confirmation flow
 */

import { NextRequest } from 'next/server';

// Mock AWS services
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.JWT_SECRET = 'test-secret';

describe('Photo Analysis Workflow Integration', () => {
  const userId = 'test-user-integration';
  const authToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Secure Photo Upload Integration', () => {
    it('should generate signed URL and validate upload parameters', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
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
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadUrl).toBeDefined();
      expect(data.imageKey).toBeDefined();
      expect(data.imageKey).toMatch(/^body-shape\/test-user-integration\/\d+\.jpeg$/);
    });

    it('should validate file type restrictions', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          analysisType: 'body-shape',
          fileType: 'application/pdf' // Invalid file type
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle different analysis types correctly', async () => {
      const { POST } = await import('../../src/app/api/analysis/upload-url/route');
      
      const analysisTypes = ['body-shape', 'color-palette'];
      
      for (const analysisType of analysisTypes) {
        const request = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
          method: 'POST',
          body: JSON.stringify({
            userId: userId,
            analysisType: analysisType,
            fileType: 'image/jpeg'
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.imageKey).toMatch(new RegExp(`^${analysisType}/`));
      }
    });
  });

  describe('Body Shape Analysis Integration', () => {
    it('should analyze body shape and return structured results', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: 'body-shape/test-user/test-image.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bodyShape).toBeDefined();
      expect(data.confidence).toBeDefined();
      expect(data.confidence).toBeGreaterThanOrEqual(0);
      expect(data.confidence).toBeLessThanOrEqual(1);
      
      // Validate body shape is from SILHOUETTE schema
      const validBodyShapes = [
        'middle_balance', 'lower_balance', 'waist_balance', 
        'upper_balance', 'equal_balance'
      ];
      expect(validBodyShapes).toContain(data.bodyShape);
    });

    it('should handle low confidence scenarios', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      // Mock low confidence response
      const mockLowConfidence = jest.fn().mockResolvedValue({
        bodyShape: 'middle_balance',
        confidence: 0.45 // Below threshold
      });

      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: 'body-shape/test-user/unclear-image.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.confidence).toBeLessThan(0.7);
      expect(data.requiresAdditionalPhotos).toBe(true);
    });

    it('should validate image key format and security', async () => {
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: '../../../etc/passwd' // Path traversal attempt
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Color Palette Analysis Integration', () => {
    it('should analyze color palette and return seasonal classification', async () => {
      const { POST } = await import('../../src/app/api/analysis/color-palette/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/color-palette', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: 'color-palette/test-user/portrait.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.colorPalette).toBeDefined();
      expect(data.colorPalette.season).toBeDefined();
      expect(data.colorPalette.colors).toBeDefined();
      expect(Array.isArray(data.colorPalette.colors)).toBe(true);
      expect(data.confidence).toBeDefined();
      
      // Validate seasonal classification
      const validSeasons = [
        'True Spring', 'Light Spring', 'Deep Spring',
        'True Summer', 'Light Summer', 'Soft Summer',
        'True Autumn', 'Soft Autumn', 'Deep Autumn',
        'True Winter', 'Bright Winter', 'Deep Winter'
      ];
      expect(validSeasons).toContain(data.colorPalette.season);
    });

    it('should extract detailed color information', async () => {
      const { POST } = await import('../../src/app/api/analysis/color-palette/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/color-palette', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: 'color-palette/test-user/detailed-portrait.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.colorPalette.skinTone).toBeDefined();
      expect(data.colorPalette.hairColor).toBeDefined();
      expect(data.colorPalette.eyeColor).toBeDefined();
      expect(data.colorPalette.colors.length).toBeGreaterThan(0);
    });
  });

  describe('Analysis Confirmation Integration', () => {
    it('should confirm analysis results and update user profile', async () => {
      const { POST } = await import('../../src/app/api/analysis/confirm/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/confirm', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          analysisType: 'body-shape',
          confirmed: true,
          results: {
            bodyShape: 'middle_balance',
            confidence: 0.85
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile).toBeDefined();
    });

    it('should handle manual adjustments for low confidence results', async () => {
      const { POST } = await import('../../src/app/api/analysis/confirm/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/confirm', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          analysisType: 'body-shape',
          confirmed: false,
          manualInput: {
            bodyShape: 'upper_balance',
            userCorrected: true
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile.physicalProfile.bodyShape).toBe('upper_balance');
    });

    it('should confirm color palette analysis with seasonal assignment', async () => {
      const { POST } = await import('../../src/app/api/analysis/confirm/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/confirm', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          analysisType: 'color-palette',
          confirmed: true,
          results: {
            season: 'True Winter',
            colors: ['#000000', '#FFFFFF', '#FF0000', '#0000FF'],
            skinTone: 'Cool',
            hairColor: 'Dark Brown',
            eyeColor: 'Brown',
            confidence: 0.92
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.profile.physicalProfile.colorPalette).toBeDefined();
      expect(data.profile.physicalProfile.colorPalette.season).toBe('True Winter');
    });
  });

  describe('Complete Photo Analysis Workflow', () => {
    it('should complete full photo analysis workflow for body shape', async () => {
      // Step 1: Generate upload URL
      const { POST: uploadUrlPost } = await import('../../src/app/api/analysis/upload-url/route');
      
      const uploadRequest = new NextRequest('http://localhost:3000/api/analysis/upload-url', {
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

      const uploadResponse = await uploadUrlPost(uploadRequest);
      const uploadData = await uploadResponse.json();
      
      expect(uploadResponse.status).toBe(200);
      expect(uploadData.imageKey).toBeDefined();

      // Step 2: Analyze uploaded image
      const { POST: analyzePost } = await import('../../src/app/api/analysis/body-shape/route');
      
      const analyzeRequest = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: uploadData.imageKey
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const analyzeResponse = await analyzePost(analyzeRequest);
      const analyzeData = await analyzeResponse.json();
      
      expect(analyzeResponse.status).toBe(200);
      expect(analyzeData.bodyShape).toBeDefined();

      // Step 3: Confirm analysis results
      const { POST: confirmPost } = await import('../../src/app/api/analysis/confirm/route');
      
      const confirmRequest = new NextRequest('http://localhost:3000/api/analysis/confirm', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          analysisType: 'body-shape',
          confirmed: true,
          results: {
            bodyShape: analyzeData.bodyShape,
            confidence: analyzeData.confidence
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const confirmResponse = await confirmPost(confirmRequest);
      const confirmData = await confirmResponse.json();
      
      expect(confirmResponse.status).toBe(200);
      expect(confirmData.success).toBe(true);
    });

    it('should handle workflow errors gracefully', async () => {
      // Test error handling in the workflow
      const { POST } = await import('../../src/app/api/analysis/body-shape/route');
      
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          imageKey: 'non-existent-image.jpg'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});