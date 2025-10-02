import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient, BEDROCK_MODEL_ID } from './aws-config';
import { logger, PerformanceMonitor, ErrorTracker } from './monitoring';

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class BedrockService {
  private modelId = BEDROCK_MODEL_ID;

  // Send message to Claude 3.5 Sonnet
  async sendMessage(messages: BedrockMessage[], systemPrompt?: string, userId?: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        temperature: 0.7,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        ...(systemPrompt && { system: systemPrompt }),
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      const latency = Date.now() - startTime;
      
      // Log successful AI interaction
      logger.aiInteraction({
        model: this.modelId,
        success: true,
        latency,
        inputTokens: responseBody.usage?.input_tokens,
        outputTokens: responseBody.usage?.output_tokens,
        userId,
        metadata: {
          messageCount: messages.length,
          hasSystemPrompt: !!systemPrompt
        }
      });
      
      return responseBody.content[0].text;
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Log failed AI interaction
      logger.aiInteraction({
        model: this.modelId,
        success: false,
        latency,
        userId,
        metadata: {
          messageCount: messages.length,
          hasSystemPrompt: !!systemPrompt,
          error: (error as Error).message
        }
      });
      
      ErrorTracker.trackAIError({
        model: this.modelId,
        error: error as Error,
        userId,
        inputData: { messageCount: messages.length }
      });
      
      throw error;
    }
  }

  // Send message with image for vision analysis
  async sendMessageWithImage(
    imageBase64: string, 
    prompt: string, 
    systemPrompt?: string,
    userId?: string
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        temperature: 0.3, // Lower temperature for more consistent analysis
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        ...(systemPrompt && { system: systemPrompt }),
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      const latency = Date.now() - startTime;
      
      // Log successful vision analysis
      logger.aiInteraction({
        model: this.modelId,
        success: true,
        latency,
        inputTokens: responseBody.usage?.input_tokens,
        outputTokens: responseBody.usage?.output_tokens,
        userId,
        metadata: {
          analysisType: 'vision',
          hasSystemPrompt: !!systemPrompt,
          imageSize: imageBase64.length
        }
      });
      
      return responseBody.content[0].text;
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Log failed vision analysis
      logger.aiInteraction({
        model: this.modelId,
        success: false,
        latency,
        userId,
        metadata: {
          analysisType: 'vision',
          hasSystemPrompt: !!systemPrompt,
          imageSize: imageBase64.length,
          error: (error as Error).message
        }
      });
      
      ErrorTracker.trackAIError({
        model: this.modelId,
        error: error as Error,
        userId,
        inputData: { analysisType: 'vision' }
      });
      
      throw error;
    }
  }

  // Generate system prompts for different analysis types
  getOnboardingSystemPrompt(): string {
    return `You are a professional personal stylist AI helping users discover their unique style profile. Your goal is to have a natural, conversational chat to understand their style preferences across five key areas:

1. EMOTIONS: How they want to feel in their clothes
2. ARCHETYPE: Their personality-based style preferences  
3. ESSENCE: Their lifestyle-based style modes
4. LIFESTYLE: Their daily life patterns and habits
5. VALUES: Their ideal style preferences and values

Ask engaging, open-ended questions one at a time. Listen carefully to their responses and ask follow-up questions to get deeper insights. Also collect their zip code for climate considerations and maximum budget for shopping.

Be warm, friendly, and encouraging. Make the conversation feel natural, not like a survey. Once you have enough information across all areas, let them know you're ready to create their style profile.`;
  }

  getBodyShapeAnalysisPrompt(): string {
    return `Analyze this full-body photo to determine the person's body shape according to these categories:
- middle_balance: Weight distributed in the middle section
- lower_balance: Weight distributed in hips/thighs area  
- waist_balance: Defined waist with balanced proportions
- upper_balance: Weight distributed in shoulders/bust area
- equal_balance: Even weight distribution throughout

Provide your analysis in this exact JSON format:
{
  "bodyShape": "category_name",
  "confidence": 0.85,
  "reasoning": "Brief explanation of your analysis"
}

Be objective and focus on silhouette and proportions, not body size or weight.`;
  }

  getColorPaletteAnalysisPrompt(): string {
    return `Analyze this portrait photo to determine the person's seasonal color palette. Look at their skin tone, hair color, and eye color to determine which season they belong to:

Spring: True Spring, Light Spring, Deep Spring
Summer: True Summer, Light Summer, Soft Summer  
Autumn: True Autumn, Soft Autumn, Deep Autumn
Winter: True Winter, Bright Winter, Deep Winter

Provide your analysis in this exact JSON format:
{
  "season": "Season Name",
  "confidence": 0.85,
  "skinTone": "description",
  "hairColor": "description", 
  "eyeColor": "description",
  "colors": ["color1", "color2", "color3"],
  "reasoning": "Brief explanation of your analysis"
}

Focus on undertones and natural coloring to make the most accurate seasonal determination.`;
  }
}

export const bedrockService = new BedrockService();