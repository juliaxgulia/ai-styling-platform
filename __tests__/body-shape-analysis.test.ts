import { POST } from '@/app/api/analysis/body-shape/route';
import { bedrockService } from '@/lib/bedrock';
import { dynamoService } from '@/lib/dynamodb';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/bedrock');
jest.mock('@/lib/dynamodb');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-analysis-id-123')
}));

// Mock fetch for image download
global.fetch = jest.fn();

const mockBedrockService = bedrockService as jest.Mocked<typeof bedrockService>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('/api/analysis/body-shape', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const validRequestBody = {
      imageUrl: 'https://example.com/test-image.jpg',
      userId: 'test-user-123'
    };

    const mockAnalysisResponse = JSON.stringify({
      bodyShape: 'waist_balance',
      confidence: 0.85,
      reasoning: 'Clear waist definition with balanced proportions between upper and lower body'
    });

    beforeEach(() => {
      // Mock successful image download
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      } as Response);

      // Mock successful Bedrock analysis
      mockBedrockService.sendMessageWithImage.mockResolvedValue(mockAnalysisResponse);

      // Mock successful DynamoDB storage
      mockDynamoService.putItem.mockResolvedValue();
    });

    it('should successfully analyze body shape with high confidence', async () => {
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual({
        bodyShape: 'waist_balance',
        confidence: 0.85,
        reasoning: 'Clear waist definition with balanced proportions between upper and lower body',
        analysisId: 'test-analysis-id-123',
        requiresAdditionalPhoto: false
      });

      // Verify Bedrock was called with correct parameters
      expect(mockBedrockService.sendMessageWithImage).toHaveBeenCalledWith(
        expect.any(String), // base64 image
        expect.stringContaining('Analyze this full-body photo'),
        expect.stringContaining('professional body shape analyst')
      );

      // Verify analysis was stored in DynamoDB
      expect(mockDynamoService.putItem).toHaveBeenCalledWith({
        PK: 'USER#test-user-123',
        SK: 'ANALYSIS#test-analysis-id-123',
        type: 'body-shape',
        imageUrl: 'https://example.com/test-image.jpg',
        results: {
          bodyShape: 'waist_balance',
          confidence: 0.85,
          reasoning: 'Clear waist definition with balanced proportions between upper and lower body'
        },
        userConfirmed: false,
        createdAt: expect.any(String)
      });
    });

    it('should flag low confidence results for additional photos', async () => {
      const lowConfidenceResponse = JSON.stringify({
        bodyShape: 'middle_balance',
        confidence: 0.65,
        reasoning: 'Unclear silhouette due to clothing or photo angle'
      });

      mockBedrockService.sendMessageWithImage.mockResolvedValue(lowConfidenceResponse);

      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.requiresAdditionalPhoto).toBe(true);
      expect(responseData.data.confidence).toBe(0.65);
    });

    it('should handle all valid silhouette categories', async () => {
      const validCategories = [
        'middle_balance',
        'lower_balance', 
        'waist_balance',
        'upper_balance',
        'equal_balance'
      ];

      for (const category of validCategories) {
        const analysisResponse = JSON.stringify({
          bodyShape: category,
          confidence: 0.8,
          reasoning: `Analysis shows ${category} body type`
        });

        mockBedrockService.sendMessageWithImage.mockResolvedValue(analysisResponse);

        const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
          method: 'POST',
          body: JSON.stringify(validRequestBody)
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.data.bodyShape).toBe(category);
      }
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequests = [
        { imageUrl: 'https://example.com/test.jpg' }, // missing userId
        { userId: 'test-user-123' }, // missing imageUrl
        {} // missing both
      ];

      for (const invalidBody of invalidRequests) {
        const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
          method: 'POST',
          body: JSON.stringify(invalidBody)
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error.message).toContain('Missing required fields');
      }
    });

    it('should handle image download failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('Failed to analyze body shape');
    });

    it('should handle invalid AI analysis responses', async () => {
      const invalidResponses = [
        'Invalid JSON response',
        JSON.stringify({ bodyShape: 'invalid_category', confidence: 0.8 }),
        JSON.stringify({ bodyShape: 'waist_balance', confidence: 1.5 }), // confidence > 1
        JSON.stringify({ bodyShape: 'waist_balance', confidence: -0.1 }), // confidence < 0
        JSON.stringify({ confidence: 0.8 }), // missing bodyShape
        JSON.stringify({ bodyShape: 'waist_balance' }) // missing confidence
      ];

      for (const invalidResponse of invalidResponses) {
        mockBedrockService.sendMessageWithImage.mockResolvedValue(invalidResponse);

        const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
          method: 'POST',
          body: JSON.stringify(validRequestBody)
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
      }
    });

    it('should handle Bedrock service failures', async () => {
      mockBedrockService.sendMessageWithImage.mockRejectedValue(new Error('Bedrock service error'));

      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('Failed to analyze body shape');
    });

    it('should handle DynamoDB storage failures', async () => {
      mockDynamoService.putItem.mockRejectedValue(new Error('DynamoDB error'));

      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('Failed to analyze body shape');
    });

    it('should use correct confidence threshold for additional photo requirement', async () => {
      const testCases = [
        { confidence: 0.69, shouldRequireAdditional: true },
        { confidence: 0.70, shouldRequireAdditional: false },
        { confidence: 0.71, shouldRequireAdditional: false }
      ];

      for (const testCase of testCases) {
        const analysisResponse = JSON.stringify({
          bodyShape: 'waist_balance',
          confidence: testCase.confidence,
          reasoning: 'Test analysis'
        });

        mockBedrockService.sendMessageWithImage.mockResolvedValue(analysisResponse);

        const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
          method: 'POST',
          body: JSON.stringify(validRequestBody)
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(responseData.data.requiresAdditionalPhoto).toBe(testCase.shouldRequireAdditional);
      }
    });

    it('should generate unique analysis IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.data.analysisId).toBe('test-analysis-id-123');
    });

    it('should store analysis with correct timestamp format', async () => {
      const request = new NextRequest('http://localhost:3000/api/analysis/body-shape', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      await POST(request);

      const storedData = mockDynamoService.putItem.mock.calls[0][0];
      expect(storedData.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});