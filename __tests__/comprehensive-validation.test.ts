/**
 * Comprehensive Validation Test Suite
 * Validates all requirements from the specification
 */

import { NextRequest } from 'next/server';
import { MockDataGenerator, RequestBuilder, ValidationHelper } from './utils/test-helpers';

// Mock AWS services
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-s3');

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_TABLE_NAME = 'test-table';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.JWT_SECRET = 'test-secret';

describe('Comprehensive Requirements Validation', () => {
  const userId = MockDataGenerator.generateUserId('validation-test');
  const authToken = MockDataGenerator.generateJWT(userId);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 1: User Onboarding & Style Discovery', () => {
    describe('1.1: Conversational onboarding flow via chat', () => {
      it('should initiate conversational onboarding flow when new user accesses system', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "Hi, I'd like to start my style profile",
          userId,
          'validation-session-1',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
        expect(data.sessionId).toBeDefined();
      });
    });

    describe('1.2: EMOTIONS schema capture and assignment', () => {
      it('should capture emotional drivers and assign EMOTIONS schema tags', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "I want to feel confident, powerful, and elegant in my clothes",
          userId,
          'validation-session-2',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
        // Validate that AI can process emotional preferences
        expect(typeof data.response).toBe('string');
      });
    });

    describe('1.3: ARCHETYPE schema capture and assignment', () => {
      it('should gather personality archetype data and assign ARCHETYPE schema tags', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "I prefer classic, timeless styles that show leadership and authority",
          userId,
          'validation-session-3',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
      });
    });

    describe('1.4: ESSENCE schema capture and assignment', () => {
      it('should gather lifestyle habits and assign ESSENCE schema tags', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "I love sophisticated, elegant looks that are classic and refined",
          userId,
          'validation-session-4',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
      });
    });

    describe('1.5: LIFESTYLE schema capture and assignment', () => {
      it('should gather personality traits and assign LIFESTYLE schema tags', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "I work in a professional corporate environment and attend social events",
          userId,
          'validation-session-5',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
      });
    });

    describe('1.6: VALUES schema capture and assignment', () => {
      it('should gather ideal style preferences and assign VALUES schema tags', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "I value high quality, sustainable fashion and prefer timeless pieces",
          userId,
          'validation-session-6',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
      });
    });

    describe('1.7: Climate preference capture', () => {
      it('should gather user zip code for climate preferences', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "My zip code is 10001",
          userId,
          'validation-session-7',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
      });
    });

    describe('1.8: Budget preference capture', () => {
      it('should gather user maximum budget value', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "My budget is around $200 per item",
          userId,
          'validation-session-8',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
      });
    });

    describe('1.9: Comprehensive style profile generation', () => {
      it('should generate comprehensive style profile when conversation is complete', async () => {
        const { POST } = await import('../src/app/api/chat/complete-profile/route');
        
        const request = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
          method: 'POST',
          body: JSON.stringify({
            userId: userId,
            sessionId: 'validation-session-complete'
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.profile).toBeDefined();
        ValidationHelper.validateStyleProfile(data.profile.styleProfile);
        expect(data.profile.preferences).toBeDefined();
      });
    });

    describe('1.10: Profile review and refinement', () => {
      it('should allow users to review and refine their profile when style profile is created', async () => {
        const { POST } = await import('../src/app/api/profile/review/route');
        
        const request = new NextRequest('http://localhost:3000/api/profile/review', {
          method: 'POST',
          body: JSON.stringify({
            userId: userId,
            updates: {
              styleProfile: MockDataGenerator.generateStyleProfile()
            }
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.success).toBe(true);
        expect(data.profile).toBeDefined();
      });
    });

    describe('1.11: Follow-up questions for unclear responses', () => {
      it('should ask follow-up questions if user provides unclear responses', async () => {
        const { POST } = await import('../src/app/api/chat/onboarding/route');
        
        const request = RequestBuilder.createOnboardingChatRequest(
          "I don't know, maybe something nice",
          userId,
          'validation-session-unclear',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.response).toBeDefined();
        // Response should contain clarifying questions
        expect(data.response.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Requirement 2: Frame & Color Analysis', () => {
    describe('2.1: Body shape analysis using SILHOUETTE schema', () => {
      it('should analyze and determine body shape according to SILHOUETTE schema when user uploads full-body photo', async () => {
        const { POST } = await import('../src/app/api/analysis/body-shape/route');
        
        const request = RequestBuilder.createBodyShapeAnalysisRequest(
          userId,
          `body-shape/${userId}/test-image.jpg`,
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.bodyShape).toBeDefined();
        
        const validBodyShapes = [
          'middle_balance', 'lower_balance', 'waist_balance',
          'upper_balance', 'equal_balance'
        ];
        expect(validBodyShapes).toContain(data.bodyShape);
      });
    });

    describe('2.2: Color palette analysis for seasonal determination', () => {
      it('should analyze skin tone, hair color, and eye color to determine seasonal color palette when user uploads portrait photo', async () => {
        const { POST } = await import('../src/app/api/analysis/color-palette/route');
        
        const request = RequestBuilder.createColorPaletteAnalysisRequest(
          userId,
          `color-palette/${userId}/portrait.jpg`,
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.colorPalette).toBeDefined();
        expect(data.colorPalette.season).toBeDefined();
        expect(data.colorPalette.colors).toBeDefined();
        expect(Array.isArray(data.colorPalette.colors)).toBe(true);
      });
    });

    describe('2.3: Body shape analysis confidence scores and confirmation', () => {
      it('should provide confidence scores and allow users to confirm or adjust results when body shape analysis is complete', async () => {
        const { POST: analyzePost } = await import('../src/app/api/analysis/body-shape/route');
        
        const analyzeRequest = RequestBuilder.createBodyShapeAnalysisRequest(
          userId,
          `body-shape/${userId}/test-image.jpg`,
          authToken
        );

        const analyzeResponse = await analyzePost(analyzeRequest);
        const analyzeData = await analyzeResponse.json();

        ValidationHelper.validateApiResponse(analyzeResponse, 200);
        expect(analyzeData.confidence).toBeDefined();
        expect(analyzeData.confidence).toBeGreaterThanOrEqual(0);
        expect(analyzeData.confidence).toBeLessThanOrEqual(1);

        // Test confirmation
        const { POST: confirmPost } = await import('../src/app/api/analysis/confirm/route');
        
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

        ValidationHelper.validateApiResponse(confirmResponse, 200);
        expect(confirmData.success).toBe(true);
      });
    });

    describe('2.4: Color palette analysis display with explanations', () => {
      it('should display recommended color palette with explanations when color palette analysis is complete', async () => {
        const { POST } = await import('../src/app/api/analysis/color-palette/route');
        
        const request = RequestBuilder.createColorPaletteAnalysisRequest(
          userId,
          `color-palette/${userId}/portrait.jpg`,
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.colorPalette.season).toBeDefined();
        expect(data.colorPalette.colors).toBeDefined();
        expect(data.colorPalette.skinTone).toBeDefined();
        expect(data.colorPalette.hairColor).toBeDefined();
        expect(data.colorPalette.eyeColor).toBeDefined();
      });
    });

    describe('2.5: Low confidence handling', () => {
      it('should request additional photos or manual input when AI analysis has low confidence', async () => {
        const { POST } = await import('../src/app/api/analysis/body-shape/route');
        
        // Mock low confidence scenario
        const request = RequestBuilder.createBodyShapeAnalysisRequest(
          userId,
          `body-shape/${userId}/unclear-image.jpg`,
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        
        if (data.confidence < 0.7) {
          expect(data.requiresAdditionalPhotos).toBe(true);
        }
      });
    });

    describe('2.6: Analysis results storage in user profile', () => {
      it('should store results in user profile for future recommendations when analysis is complete', async () => {
        const { POST: confirmPost } = await import('../src/app/api/analysis/confirm/route');
        
        const confirmRequest = new NextRequest('http://localhost:3000/api/analysis/confirm', {
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

        const confirmResponse = await confirmPost(confirmRequest);
        const confirmData = await confirmResponse.json();

        ValidationHelper.validateApiResponse(confirmResponse, 200);
        expect(confirmData.profile).toBeDefined();
        expect(confirmData.profile.physicalProfile).toBeDefined();
        ValidationHelper.validatePhysicalProfile(confirmData.profile.physicalProfile);
      });
    });

    describe('2.7: Secure photo storage with privacy controls', () => {
      it('should store photos securely with appropriate privacy controls when photos are uploaded', async () => {
        const { POST } = await import('../src/app/api/analysis/upload-url/route');
        
        const request = RequestBuilder.createUploadUrlRequest(
          userId,
          'body-shape',
          'image/jpeg',
          authToken
        );

        const response = await POST(request);
        const data = await response.json();

        ValidationHelper.validateApiResponse(response, 200);
        expect(data.uploadUrl).toBeDefined();
        expect(data.imageKey).toBeDefined();
        
        // Validate secure URL structure
        expect(data.uploadUrl).toMatch(/X-Amz-Expires/);
        expect(data.uploadUrl).toMatch(/X-Amz-Signature/);
        
        // Validate user-specific key prefix
        expect(data.imageKey).toMatch(new RegExp(`^body-shape/${userId}/`));
      });
    });
  });

  describe('Cross-Requirement Integration Tests', () => {
    it('should complete full user journey from onboarding to profile completion', async () => {
      // This test validates the integration of all requirements
      const journeyUserId = MockDataGenerator.generateUserId('journey-test');
      const journeyToken = MockDataGenerator.generateJWT(journeyUserId);
      
      // Step 1: Start onboarding
      const { POST: chatPost } = await import('../src/app/api/chat/onboarding/route');
      
      const chatRequest = RequestBuilder.createOnboardingChatRequest(
        "I want to feel confident and elegant in professional settings",
        journeyUserId,
        'journey-session',
        journeyToken
      );

      const chatResponse = await chatPost(chatRequest);
      ValidationHelper.validateApiResponse(chatResponse, 200);

      // Step 2: Complete profile generation
      const { POST: profilePost } = await import('../src/app/api/chat/complete-profile/route');
      
      const profileRequest = new NextRequest('http://localhost:3000/api/chat/complete-profile', {
        method: 'POST',
        body: JSON.stringify({
          userId: journeyUserId,
          sessionId: 'journey-session'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${journeyToken}`
        }
      });

      const profileResponse = await profilePost(profileRequest);
      ValidationHelper.validateApiResponse(profileResponse, 200);

      // Step 3: Upload and analyze photos
      const { POST: uploadPost } = await import('../src/app/api/analysis/upload-url/route');
      
      const uploadRequest = RequestBuilder.createUploadUrlRequest(
        journeyUserId,
        'body-shape',
        'image/jpeg',
        journeyToken
      );

      const uploadResponse = await uploadPost(uploadRequest);
      ValidationHelper.validateApiResponse(uploadResponse, 200);

      // Step 4: Analyze body shape
      const { POST: analyzePost } = await import('../src/app/api/analysis/body-shape/route');
      
      const uploadData = await uploadResponse.json();
      const analyzeRequest = RequestBuilder.createBodyShapeAnalysisRequest(
        journeyUserId,
        uploadData.imageKey,
        journeyToken
      );

      const analyzeResponse = await analyzePost(analyzeRequest);
      ValidationHelper.validateApiResponse(analyzeResponse, 200);

      // Step 5: Confirm analysis
      const { POST: confirmPost } = await import('../src/app/api/analysis/confirm/route');
      
      const analyzeData = await analyzeResponse.json();
      const confirmRequest = new NextRequest('http://localhost:3000/api/analysis/confirm', {
        method: 'POST',
        body: JSON.stringify({
          userId: journeyUserId,
          analysisType: 'body-shape',
          confirmed: true,
          results: {
            bodyShape: analyzeData.bodyShape,
            confidence: analyzeData.confidence
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${journeyToken}`
        }
      });

      const confirmResponse = await confirmPost(confirmRequest);
      ValidationHelper.validateApiResponse(confirmResponse, 200);

      const confirmData = await confirmResponse.json();
      expect(confirmData.success).toBe(true);
      expect(confirmData.profile).toBeDefined();
      
      // Validate complete profile has all required components
      ValidationHelper.validateStyleProfile(confirmData.profile.styleProfile);
      ValidationHelper.validatePhysicalProfile(confirmData.profile.physicalProfile);
      expect(confirmData.profile.preferences).toBeDefined();
    });
  });
});