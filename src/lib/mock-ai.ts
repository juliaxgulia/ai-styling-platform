// Mock AI service for demo purposes when Bedrock is unavailable
export class MockAIService {
  private responses = [
    "Hello! I'm excited to help you discover your personal style. Let's start by talking about how you want to feel when you're dressed up. Do you prefer feeling confident and powerful, or more relaxed and comfortable?",
    
    "That's great insight! Now I'm curious about your lifestyle. Are you someone who's always on the go with a busy schedule, or do you prefer a more relaxed, leisurely pace?",
    
    "Interesting! Let's talk about what inspires you. When you see someone with great style, what draws you to them? Is it their boldness, their elegance, their creativity, or something else?",
    
    "I love that! Now, thinking about your daily life - do you work in a professional environment, are you more creative/artistic, or do you have a mix of different settings you dress for?",
    
    "Perfect! One more thing - what matters most to you when choosing clothes? Is it comfort, looking put-together, expressing your personality, or staying on-trend?",
    
    "Wonderful! I'm getting a great sense of your style preferences. Can you tell me your zip code so I can consider your local climate, and what's a comfortable budget range for you when shopping for clothes?",
    
    "Excellent! I have everything I need to create your personalized style profile. Based on our conversation, I can see you have a unique blend of preferences that will help guide your style journey. Your profile is now complete!"
  ];
  
  private currentIndex = 0;

  async sendMessage(messages: any[], systemPrompt?: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const response = this.responses[this.currentIndex] || this.responses[this.responses.length - 1];
    this.currentIndex = Math.min(this.currentIndex + 1, this.responses.length - 1);
    
    return response;
  }

  reset() {
    this.currentIndex = 0;
  }
}

export const mockAIService = new MockAIService();