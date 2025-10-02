import { POST } from '@/app/api/analysis/color-palette/route';
import { getAuthUser } from '@/lib/auth';
import { bedrockClient } from '@/lib/aws-config';
import { dynamoService } from '@/lib/dynamodb';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/aws-config');
jest.mock('@/lib/dynamodb');

const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockBedrockClient = bedrockClient as jest.Mocked<typeof bedrockClient>;
const mockDynamoService = dynamoService as jest.Mocked<typeof dynamoService>;

describe('/api/analysis/color-palette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
  };

  const mockClaudeResponse = {
    body: new TextEncoder().encode(JSON.stringify({
      content: [{
        text: JSON.stringify({
          colorPalette: 'True Spring',
          skinTone: 'Warm undertones with peachy complexion',
          hairColor: 'Golden blonde with warm highlights',
          eyeColor: 'Bright blue with golden flecks',
          confidence: 0.85,
          reasoning: 'The warm undertones in skin, golden hair, and bright eyes indicate a True Spring palette'
        })
      }]
    }))
  };

  describe('POST', () => {
    it('should analyze color palette successfully', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(mockClaudeResponse);
      mockDynamoService.createAnalysisResult.mockResolvedValue();

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.colorPalette.season).toBe('True Spring');
      expect(data.data.confidence).toBe(0.85);
      expect(data.data.colorPalette.colors).toContain('coral');
      expect(data.data.recommendations.bestColors).toHaveLength(4);
      expect(data.data.recommendations.avoidColors).toContain('black');
      expect(data.data.recommendations.tips).toHaveLength(4);

      expect(mockDynamoService.createAnalysisResult).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: 'USER#user123',
          type: 'color-palette',
          userConfirmed: false
        })
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Unauthorized');
    });

    it('should return 400 for missing imageUrl', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);

      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Missing required field: imageUrl');
    });

    it('should handle different seasonal palettes correctly', async () => {
      const winterResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              colorPalette: 'True Winter',
              skinTone: 'Cool undertones with clear complexion',
              hairColor: 'Dark brown with cool undertones',
              eyeColor: 'Deep brown with clear whites',
              confidence: 0.90,
              reasoning: 'Cool undertones and high contrast indicate True Winter palette'
            })
          }]
        }))
      };

      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(winterResponse);
      mockDynamoService.createAnalysisResult.mockResolvedValue();

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.colorPalette.season).toBe('True Winter');
      expect(data.data.colorPalette.colors).toContain('true red');
      expect(data.data.recommendations.avoidColors).toContain('orange');
    });

    it('should handle Summer palette correctly', async () => {
      const summerResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              colorPalette: 'Light Summer',
              skinTone: 'Cool, light undertones with delicate complexion',
              hairColor: 'Light ash blonde',
              eyeColor: 'Light blue with soft intensity',
              confidence: 0.80,
              reasoning: 'Light, cool coloring indicates Light Summer palette'
            })
          }]
        }))
      };

      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(summerResponse);
      mockDynamoService.createAnalysisResult.mockResolvedValue();

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.colorPalette.season).toBe('Light Summer');
      expect(data.data.colorPalette.colors).toContain('baby pink');
      expect(data.data.recommendations.tips[0]).toContain('light, cool colors');
    });

    it('should handle Autumn palette correctly', async () => {
      const autumnResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              colorPalette: 'Deep Autumn',
              skinTone: 'Warm, deep undertones with rich complexion',
              hairColor: 'Dark brown with golden highlights',
              eyeColor: 'Deep hazel with golden flecks',
              confidence: 0.88,
              reasoning: 'Deep, warm coloring with rich intensity indicates Deep Autumn palette'
            })
          }]
        }))
      };

      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(autumnResponse);
      mockDynamoService.createAnalysisResult.mockResolvedValue();

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.colorPalette.season).toBe('Deep Autumn');
      expect(data.data.colorPalette.colors).toContain('burgundy');
      expect(data.data.recommendations.tips[0]).toContain('deep, rich colors');
    });

    it('should return 500 for invalid Claude response format', async () => {
      const invalidResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: 'This is not valid JSON'
          }]
        }))
      };

      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(invalidResponse);

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to parse color analysis results');
    });

    it('should return 500 for unknown color palette', async () => {
      const unknownPaletteResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              colorPalette: 'Unknown Palette',
              skinTone: 'Test',
              hairColor: 'Test',
              eyeColor: 'Test',
              confidence: 0.5,
              reasoning: 'Test'
            })
          }]
        }))
      };

      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(unknownPaletteResponse);

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Invalid color palette detected');
    });

    it('should return 500 for Bedrock service errors', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockRejectedValue(new Error('Bedrock error'));

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to analyze color palette');
    });

    it('should return 500 for DynamoDB errors', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(mockClaudeResponse);
      mockDynamoService.createAnalysisResult.mockRejectedValue(new Error('DynamoDB error'));

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,test'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Failed to analyze color palette');
    });

    it('should handle base64 image URLs correctly', async () => {
      mockGetAuthUser.mockResolvedValue(mockUser);
      mockBedrockClient.send = jest.fn().mockResolvedValue(mockClaudeResponse);
      mockDynamoService.createAnalysisResult.mockResolvedValue();

      const request = createMockRequest({
        imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/test'
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockBedrockClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            body: expect.stringContaining('/9j/4AAQSkZJRgABAQAAAQABAAD/test')
          })
        })
      );
    });

    it('should provide appropriate color recommendations for each season', async () => {
      // Test that each season gets appropriate avoid colors and tips
      const seasons = [
        { palette: 'True Spring', expectedAvoid: 'black', expectedTip: 'warm' },
        { palette: 'True Summer', expectedAvoid: 'orange', expectedTip: 'cool' },
        { palette: 'True Autumn', expectedAvoid: 'icy colors', expectedTip: 'warm' },
        { palette: 'True Winter', expectedAvoid: 'orange', expectedTip: 'clear' }
      ];

      for (const season of seasons) {
        const seasonResponse = {
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify({
                colorPalette: season.palette,
                skinTone: 'Test',
                hairColor: 'Test',
                eyeColor: 'Test',
                confidence: 0.8,
                reasoning: 'Test'
              })
            }]
          }))
        };

        mockGetAuthUser.mockResolvedValue(mockUser);
        mockBedrockClient.send = jest.fn().mockResolvedValue(seasonResponse);
        mockDynamoService.createAnalysisResult.mockResolvedValue();

        const request = createMockRequest({
          imageUrl: 'data:image/jpeg;base64,test'
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.recommendations.avoidColors).toContain(season.expectedAvoid);
        expect(data.data.recommendations.tips.some((tip: string) => 
          tip.toLowerCase().includes(season.expectedTip)
        )).toBe(true);
      }
    });
  });
});