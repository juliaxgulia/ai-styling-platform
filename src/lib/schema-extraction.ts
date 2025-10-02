import { bedrockService } from './bedrock';
import { preferenceValidationService } from './preference-validation';
import { 
  SCHEMA_METADATA, 
  EmotionTag, 
  ArchetypeTag, 
  EssenceTag, 
  LifestyleTag, 
  ValueTag 
} from '@/types/schemas';
import { ConversationMessage, ExtractedData } from '@/types/user';

export interface SchemaExtractionResult {
  emotions?: EmotionTag[];
  archetype?: ArchetypeTag[];
  essence?: EssenceTag[];
  lifestyle?: LifestyleTag[];
  values?: ValueTag[];
  zipCode?: string;
  maxBudget?: number;
}

export class SchemaExtractionService {
  
  /**
   * Extract emotional drivers from conversation and map to EMOTIONS schema
   */
  async extractEmotions(conversationHistory: ConversationMessage[]): Promise<EmotionTag[]> {
    const prompt = this.createEmotionsExtractionPrompt(conversationHistory);
    
    try {
      const response = await bedrockService.sendMessage(
        [{ role: 'user', content: prompt }],
        'You are a style psychology expert. Extract emotional drivers from conversations and map them to predefined emotion tags. Return only valid JSON.'
      );

      const extracted = this.parseExtractionResponse(response);
      return this.validateEmotionTags(extracted.emotions || []);
    } catch (error) {
      console.error('Error extracting emotions:', error);
      return [];
    }
  }

  /**
   * Extract personality archetype and map to ARCHETYPE schema
   */
  async extractArchetype(conversationHistory: ConversationMessage[]): Promise<ArchetypeTag[]> {
    const prompt = this.createArchetypeExtractionPrompt(conversationHistory);
    
    try {
      const response = await bedrockService.sendMessage(
        [{ role: 'user', content: prompt }],
        'You are a personality psychology expert. Extract personality archetypes from conversations and map them to predefined archetype tags. Return only valid JSON.'
      );

      const extracted = this.parseExtractionResponse(response);
      return this.validateArchetypeTags(extracted.archetype || []);
    } catch (error) {
      console.error('Error extracting archetype:', error);
      return [];
    }
  }

  /**
   * Extract style essence and map to ESSENCE schema
   */
  async extractEssence(conversationHistory: ConversationMessage[]): Promise<EssenceTag[]> {
    const prompt = this.createEssenceExtractionPrompt(conversationHistory);
    
    try {
      const response = await bedrockService.sendMessage(
        [{ role: 'user', content: prompt }],
        'You are a style essence expert. Extract style essence preferences from conversations and map them to predefined essence tags. Return only valid JSON.'
      );

      const extracted = this.parseExtractionResponse(response);
      return this.validateEssenceTags(extracted.essence || []);
    } catch (error) {
      console.error('Error extracting essence:', error);
      return [];
    }
  }

  /**
   * Extract lifestyle patterns and map to LIFESTYLE schema
   */
  async extractLifestyle(conversationHistory: ConversationMessage[]): Promise<LifestyleTag[]> {
    const prompt = this.createLifestyleExtractionPrompt(conversationHistory);
    
    try {
      const response = await bedrockService.sendMessage(
        [{ role: 'user', content: prompt }],
        'You are a lifestyle analysis expert. Extract lifestyle patterns from conversations and map them to predefined lifestyle tags. Return only valid JSON.'
      );

      const extracted = this.parseExtractionResponse(response);
      return this.validateLifestyleTags(extracted.lifestyle || []);
    } catch (error) {
      console.error('Error extracting lifestyle:', error);
      return [];
    }
  }

  /**
   * Extract values and map to VALUES schema
   */
  async extractValues(conversationHistory: ConversationMessage[]): Promise<ValueTag[]> {
    const prompt = this.createValuesExtractionPrompt(conversationHistory);
    
    try {
      const response = await bedrockService.sendMessage(
        [{ role: 'user', content: prompt }],
        'You are a values analysis expert. Extract personal values from conversations and map them to predefined value tags. Return only valid JSON.'
      );

      const extracted = this.parseExtractionResponse(response);
      return this.validateValueTags(extracted.values || []);
    } catch (error) {
      console.error('Error extracting values:', error);
      return [];
    }
  }

  /**
   * Extract all preferences from conversation in one call
   */
  async extractAllPreferences(
    conversationHistory: ConversationMessage[],
    currentData: ExtractedData
  ): Promise<SchemaExtractionResult> {
    const prompt = this.createComprehensiveExtractionPrompt(conversationHistory);
    
    try {
      const response = await bedrockService.sendMessage(
        [{ role: 'user', content: prompt }],
        'You are a comprehensive style analysis expert. Extract all style preferences from conversations and map them to predefined schema tags. Return only valid JSON.'
      );

      const extracted = this.parseExtractionResponse(response);
      
      // Validate zip code and budget
      let validatedZipCode = currentData.zipCode;
      let validatedBudget = currentData.maxBudget;

      if (extracted.zipCode) {
        const zipValidation = preferenceValidationService.validateZipCode(extracted.zipCode);
        if (zipValidation.isValid) {
          validatedZipCode = zipValidation.zipCode;
        }
      }

      if (extracted.maxBudget) {
        const budgetValidation = preferenceValidationService.validateBudget(extracted.maxBudget);
        if (budgetValidation.isValid) {
          validatedBudget = budgetValidation.budget;
        }
      }

      // Also try to extract from conversation text
      const conversationText = conversationHistory.map(msg => msg.content).join(' ');
      
      if (!validatedZipCode) {
        const extractedZip = preferenceValidationService.extractZipCodeFromText(conversationText);
        if (extractedZip) {
          validatedZipCode = extractedZip;
        }
      }

      if (!validatedBudget) {
        const extractedBudget = preferenceValidationService.extractBudgetFromText(conversationText);
        if (extractedBudget) {
          validatedBudget = extractedBudget;
        }
      }
      
      return {
        emotions: this.validateEmotionTags(extracted.emotions || []),
        archetype: this.validateArchetypeTags(extracted.archetype || []),
        essence: this.validateEssenceTags(extracted.essence || []),
        lifestyle: this.validateLifestyleTags(extracted.lifestyle || []),
        values: this.validateValueTags(extracted.values || []),
        zipCode: validatedZipCode,
        maxBudget: validatedBudget,
      };
    } catch (error) {
      console.error('Error extracting all preferences:', error);
      return currentData;
    }
  }

  // Private helper methods for creating extraction prompts

  private createEmotionsExtractionPrompt(conversationHistory: ConversationMessage[]): string {
    const availableTags = SCHEMA_METADATA.EMOTIONS.tags.join(', ');
    const conversation = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
Analyze this conversation and extract how the person wants to FEEL when wearing clothes. Look for emotional drivers and desired feelings.

Available emotion tags: ${availableTags}

Conversation:
${conversation}

Extract emotions that match the available tags. Focus on:
- How they want to feel in their clothes
- Emotional states they want to achieve through style
- Confidence levels and emotional goals
- Feelings they associate with looking good

Return ONLY a JSON object in this format:
{
  "emotions": ["tag1", "tag2"]
}

Only include tags that have clear evidence in the conversation. Be conservative and accurate.
`;
  }

  private createArchetypeExtractionPrompt(conversationHistory: ConversationMessage[]): string {
    const availableTags = SCHEMA_METADATA.ARCHETYPE.tags.join(', ');
    const conversation = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
Analyze this conversation and extract the person's personality archetype based on their style preferences and personality traits.

Available archetype tags: ${availableTags}

Conversation:
${conversation}

Extract archetypes that match their personality. Focus on:
- Leadership vs. supportive tendencies
- Creative vs. structured preferences
- Adventurous vs. traditional inclinations
- Social vs. independent nature
- Authority vs. rebellious traits

Return ONLY a JSON object in this format:
{
  "archetype": ["tag1"]
}

Usually select 1-2 primary archetypes that best represent their personality. Be conservative and accurate.
`;
  }

  private createEssenceExtractionPrompt(conversationHistory: ConversationMessage[]): string {
    const availableTags = SCHEMA_METADATA.ESSENCE.tags.join(', ');
    const conversation = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
Analyze this conversation and extract the person's style essence - their core aesthetic preferences and style modes.

Available essence tags: ${availableTags}

Conversation:
${conversation}

Extract essences that match their aesthetic preferences. Focus on:
- Classic vs. trendy preferences
- Dramatic vs. subtle style choices
- Natural vs. polished inclinations
- Romantic vs. edgy aesthetics
- Structured vs. flowing preferences

Return ONLY a JSON object in this format:
{
  "essence": ["tag1", "tag2"]
}

Select 1-3 essences that best represent their core style aesthetic. Be conservative and accurate.
`;
  }

  private createLifestyleExtractionPrompt(conversationHistory: ConversationMessage[]): string {
    const availableTags = SCHEMA_METADATA.LIFESTYLE.tags.join(', ');
    const conversation = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
Analyze this conversation and extract the person's lifestyle patterns and daily activities.

Available lifestyle tags: ${availableTags}

Conversation:
${conversation}

Extract lifestyle patterns that match their daily life. Focus on:
- Work environment and professional needs
- Social activities and events
- Casual daily activities
- Fitness and active pursuits
- Leisure and relaxation preferences

Return ONLY a JSON object in this format:
{
  "lifestyle": ["tag1", "tag2"]
}

Select 2-4 lifestyle tags that best represent their daily activities. Be conservative and accurate.
`;
  }

  private createValuesExtractionPrompt(conversationHistory: ConversationMessage[]): string {
    const availableTags = SCHEMA_METADATA.VALUES.tags.join(', ');
    const conversation = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
Analyze this conversation and extract the person's values and ideals related to fashion and style.

Available value tags: ${availableTags}

Conversation:
${conversation}

Extract values that match their ideals. Focus on:
- Environmental and sustainability concerns
- Quality vs. quantity preferences
- Budget and luxury attitudes
- Cultural and identity values
- Comfort and practicality priorities
- Artistic and creative expression

Return ONLY a JSON object in this format:
{
  "values": ["tag1", "tag2"]
}

Select 2-5 values that best represent their style ideals. Be conservative and accurate.
`;
  }

  private createComprehensiveExtractionPrompt(conversationHistory: ConversationMessage[]): string {
    const conversation = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
Analyze this conversation and extract ALL style preferences, mapping them to the appropriate schema tags.

Available schemas and tags:
- emotions: ${SCHEMA_METADATA.EMOTIONS.tags.join(', ')}
- archetype: ${SCHEMA_METADATA.ARCHETYPE.tags.join(', ')}
- essence: ${SCHEMA_METADATA.ESSENCE.tags.join(', ')}
- lifestyle: ${SCHEMA_METADATA.LIFESTYLE.tags.join(', ')}
- values: ${SCHEMA_METADATA.VALUES.tags.join(', ')}

Conversation:
${conversation}

Also extract:
- zipCode: if mentioned (5-digit US zip code)
- maxBudget: if mentioned (monthly budget as number)

Return ONLY a JSON object in this format:
{
  "emotions": ["tag1", "tag2"],
  "archetype": ["tag1"],
  "essence": ["tag1", "tag2"],
  "lifestyle": ["tag1", "tag2"],
  "values": ["tag1", "tag2"],
  "zipCode": "12345",
  "maxBudget": 500
}

Only include fields where you found clear evidence in the conversation. Be conservative and accurate.
`;
  }

  // Validation methods

  private validateEmotionTags(tags: string[]): EmotionTag[] {
    return tags.filter(tag => SCHEMA_METADATA.EMOTIONS.tags.includes(tag as EmotionTag)) as EmotionTag[];
  }

  private validateArchetypeTags(tags: string[]): ArchetypeTag[] {
    return tags.filter(tag => SCHEMA_METADATA.ARCHETYPE.tags.includes(tag as ArchetypeTag)) as ArchetypeTag[];
  }

  private validateEssenceTags(tags: string[]): EssenceTag[] {
    return tags.filter(tag => SCHEMA_METADATA.ESSENCE.tags.includes(tag as EssenceTag)) as EssenceTag[];
  }

  private validateLifestyleTags(tags: string[]): LifestyleTag[] {
    return tags.filter(tag => SCHEMA_METADATA.LIFESTYLE.tags.includes(tag as LifestyleTag)) as LifestyleTag[];
  }

  private validateValueTags(tags: string[]): ValueTag[] {
    return tags.filter(tag => SCHEMA_METADATA.VALUES.tags.includes(tag as ValueTag)) as ValueTag[];
  }

  private parseExtractionResponse(response: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('Error parsing extraction response:', error);
      return {};
    }
  }
}

export const schemaExtractionService = new SchemaExtractionService();