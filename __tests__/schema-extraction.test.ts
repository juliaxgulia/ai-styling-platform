import { schemaExtractionService } from '@/lib/schema-extraction';
import { bedrockService } from '@/lib/bedrock';
import { ConversationMessage } from '@/types/user';

// Mock dependencies
jest.mock('@/lib/bedrock');

const mockBedrockService = bedrockService as jest.Mocked<typeof bedrockService>;

describe('SchemaExtractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractEmotions', () => {
    it('should extract emotion tags from conversation', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'assistant',
          content: 'How do you want to feel when wearing clothes?',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          role: 'user',
          content: 'I want to feel confident and powerful when I dress up for work',
          timestamp: '2024-01-01T00:01:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"emotions": ["Confident", "Powerful"]}');

      const result = await schemaExtractionService.extractEmotions(conversationHistory);

      expect(result).toEqual(['Confident', 'Powerful']);
      expect(mockBedrockService.sendMessage).toHaveBeenCalledWith(
        [{ role: 'user', content: expect.stringContaining('confident and powerful') }],
        expect.stringContaining('style psychology expert')
      );
    });

    it('should filter out invalid emotion tags', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I want to feel amazing and fantastic',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"emotions": ["Confident", "InvalidTag", "Powerful"]}');

      const result = await schemaExtractionService.extractEmotions(conversationHistory);

      expect(result).toEqual(['Confident', 'Powerful']);
    });

    it('should handle AI service errors gracefully', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I want to feel confident',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockRejectedValue(new Error('AI service error'));

      const result = await schemaExtractionService.extractEmotions(conversationHistory);

      expect(result).toEqual([]);
    });
  });

  describe('extractArchetype', () => {
    it('should extract archetype tags from conversation', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'assistant',
          content: 'Tell me about your personality',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          role: 'user',
          content: 'I\'m a natural leader and like to take charge in situations',
          timestamp: '2024-01-01T00:01:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"archetype": ["The Hero"]}');

      const result = await schemaExtractionService.extractArchetype(conversationHistory);

      expect(result).toEqual(['The Hero']);
      expect(mockBedrockService.sendMessage).toHaveBeenCalledWith(
        [{ role: 'user', content: expect.stringContaining('natural leader') }],
        expect.stringContaining('personality psychology expert')
      );
    });

    it('should filter out invalid archetype tags', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I\'m creative and artistic',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"archetype": ["The Creator", "InvalidArchetype"]}');

      const result = await schemaExtractionService.extractArchetype(conversationHistory);

      expect(result).toEqual(['The Creator']);
    });
  });

  describe('extractEssence', () => {
    it('should extract essence tags from conversation', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I prefer classic, timeless pieces that never go out of style',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"essence": ["Classic"]}');

      const result = await schemaExtractionService.extractEssence(conversationHistory);

      expect(result).toEqual(['Classic']);
      expect(mockBedrockService.sendMessage).toHaveBeenCalledWith(
        [{ role: 'user', content: expect.stringContaining('classic, timeless') }],
        expect.stringContaining('style essence expert')
      );
    });

    it('should handle multiple essence tags', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I like both classic pieces and dramatic statement items',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"essence": ["Classic", "Dramatic"]}');

      const result = await schemaExtractionService.extractEssence(conversationHistory);

      expect(result).toEqual(['Classic', 'Dramatic']);
    });
  });

  describe('extractLifestyle', () => {
    it('should extract lifestyle tags from conversation', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I work in a corporate office and go to networking events regularly',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"lifestyle": ["Professional", "Social"]}');

      const result = await schemaExtractionService.extractLifestyle(conversationHistory);

      expect(result).toEqual(['Professional', 'Social']);
      expect(mockBedrockService.sendMessage).toHaveBeenCalledWith(
        [{ role: 'user', content: expect.stringContaining('corporate office') }],
        expect.stringContaining('lifestyle analysis expert')
      );
    });

    it('should filter out invalid lifestyle tags', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I work from home and exercise daily',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"lifestyle": ["Casual", "Fitness", "InvalidLifestyle"]}');

      const result = await schemaExtractionService.extractLifestyle(conversationHistory);

      expect(result).toEqual(['Casual', 'Fitness']);
    });
  });

  describe('extractValues', () => {
    it('should extract value tags from conversation', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I care about sustainability and prefer high-quality pieces that last',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"values": ["Sustainable", "High Quality"]}');

      const result = await schemaExtractionService.extractValues(conversationHistory);

      expect(result).toEqual(['Sustainable', 'High Quality']);
      expect(mockBedrockService.sendMessage).toHaveBeenCalledWith(
        [{ role: 'user', content: expect.stringContaining('sustainability') }],
        expect.stringContaining('values analysis expert')
      );
    });

    it('should handle multiple value tags', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I love vintage pieces and support local designers when possible',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockBedrockService.sendMessage.mockResolvedValue('{"values": ["Secondhand / Vintage", "Local / Independent"]}');

      const result = await schemaExtractionService.extractValues(conversationHistory);

      expect(result).toEqual(['Secondhand / Vintage', 'Local / Independent']);
    });
  });

  describe('extractAllPreferences', () => {
    it('should extract all preferences from conversation', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I want to feel confident and powerful. I\'m a natural leader who prefers classic styles. I work in a professional environment and value sustainability. My zip code is 10001 and my budget is around $500 per month.',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const currentData = {};

      mockBedrockService.sendMessage.mockResolvedValue(`{
        "emotions": ["Confident", "Powerful"],
        "archetype": ["The Hero"],
        "essence": ["Classic"],
        "lifestyle": ["Professional"],
        "values": ["Sustainable"],
        "zipCode": "10001",
        "maxBudget": 500
      }`);

      const result = await schemaExtractionService.extractAllPreferences(conversationHistory, currentData);

      expect(result).toEqual({
        emotions: ['Confident', 'Powerful'],
        archetype: ['The Hero'],
        essence: ['Classic'],
        lifestyle: ['Professional'],
        values: ['Sustainable'],
        zipCode: '10001',
        maxBudget: 500,
      });
    });

    it('should preserve existing data when no new data is found', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Hello there',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const currentData = {
        emotions: ['Confident'],
        zipCode: '90210',
      };

      mockBedrockService.sendMessage.mockResolvedValue('{}');

      const result = await schemaExtractionService.extractAllPreferences(conversationHistory, currentData);

      expect(result.emotions).toEqual([]);
      expect(result.zipCode).toBe('90210');
    });

    it('should handle malformed JSON responses', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I want to feel confident',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const currentData = { emotions: ['Powerful'] };

      mockBedrockService.sendMessage.mockResolvedValue('Invalid JSON response');

      const result = await schemaExtractionService.extractAllPreferences(conversationHistory, currentData);

      expect(result).toEqual({
        emotions: [],
        archetype: [],
        essence: [],
        lifestyle: [],
        values: [],
        zipCode: undefined,
        maxBudget: undefined,
      });
    });

    it('should filter out invalid tags from all schemas', async () => {
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: 'I want to feel amazing',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      const currentData = {};

      mockBedrockService.sendMessage.mockResolvedValue(`{
        "emotions": ["Confident", "InvalidEmotion"],
        "archetype": ["The Hero", "InvalidArchetype"],
        "essence": ["Classic", "InvalidEssence"],
        "lifestyle": ["Professional", "InvalidLifestyle"],
        "values": ["Sustainable", "InvalidValue"]
      }`);

      const result = await schemaExtractionService.extractAllPreferences(conversationHistory, currentData);

      expect(result).toEqual({
        emotions: ['Confident'],
        archetype: ['The Hero'],
        essence: ['Classic'],
        lifestyle: ['Professional'],
        values: ['Sustainable'],
        zipCode: undefined,
        maxBudget: undefined,
      });
    });
  });
});