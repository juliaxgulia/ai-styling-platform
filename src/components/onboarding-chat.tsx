'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ConversationMessage, ExtractedData } from '@/types/user';
import { Send, RotateCcw, AlertCircle, Settings, Clock } from 'lucide-react';
import { ErrorDisplay } from './error-display';
import { FallbackService } from '@/lib/retry-service';

interface OnboardingChatProps {
  userId: string;
  onComplete?: (extractedData: ExtractedData) => void;
  onError?: (error: string) => void;
}

interface ChatState {
  messages: ConversationMessage[];
  sessionId?: string;
  currentStep: string;
  extractedData: ExtractedData;
  isComplete: boolean;
  isLoading: boolean;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
    recoveryActions?: Array<{
      type: 'retry' | 'fallback' | 'session_recovery';
      label: string;
      description: string;
    }>;
  };
  retryCount: number;
  hasRecoveredSession: boolean;
}

const STEP_LABELS = {
  greeting: 'Getting Started',
  emotions: 'Emotional Drivers',
  archetype: 'Personality Style',
  essence: 'Style Essence',
  lifestyle: 'Lifestyle Patterns',
  values: 'Style Values',
  location: 'Climate Preferences',
  budget: 'Budget Range',
  complete: 'Profile Complete'
};

const STEP_ORDER = ['greeting', 'emotions', 'archetype', 'essence', 'lifestyle', 'values', 'location', 'budget', 'complete'];

export function OnboardingChat({ userId, onComplete, onError }: OnboardingChatProps) {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    currentStep: 'greeting',
    extractedData: {},
    isComplete: false,
    isLoading: false,
    retryCount: 0,
    hasRecoveredSession: false
  });
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatState.messages, isTyping]);

  // Focus input on mount and after sending messages
  useEffect(() => {
    if (inputRef.current && typeof inputRef.current.focus === 'function') {
      inputRef.current.focus();
    }
  }, [chatState.isLoading]);

  // Start conversation on mount
  useEffect(() => {
    if (chatState.messages.length === 0) {
      startConversation();
    }
  }, []);

  // Handle completion
  useEffect(() => {
    if (chatState.isComplete && onComplete) {
      onComplete(chatState.extractedData);
    }
  }, [chatState.isComplete, chatState.extractedData, onComplete]);

  const startConversation = async () => {
    try {
      setChatState(prev => ({ ...prev, isLoading: true, error: undefined }));
      setIsTyping(true);
      
      // Check for session recovery first
      const recoveryData = localStorage.getItem(`session_recovery_${userId}_onboarding`);
      if (recoveryData && !chatState.hasRecoveredSession) {
        const parsed = JSON.parse(recoveryData);
        const savedAt = new Date(parsed.savedAt);
        const now = new Date();
        
        // Recovery data expires after 24 hours
        if (now.getTime() - savedAt.getTime() < 24 * 60 * 60 * 1000) {
          setChatState(prev => ({
            ...prev,
            sessionId: parsed.sessionId,
            extractedData: parsed.recoveryData.extractedData || {},
            currentStep: parsed.recoveryData.currentStep || 'greeting',
            hasRecoveredSession: true,
            error: {
              message: 'We found a previous session. Would you like to continue where you left off?',
              code: 'SESSION_RECOVERY_AVAILABLE',
              retryable: false,
              recoveryActions: [
                {
                  type: 'session_recovery',
                  label: 'Continue Previous Session',
                  description: 'Resume your onboarding from where you left off'
                },
                {
                  type: 'retry',
                  label: 'Start Fresh',
                  description: 'Begin a new onboarding session'
                }
              ]
            }
          }));
          setIsTyping(false);
          return;
        }
      }
      
      const response = await fetch('/api/chat/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello, I\'d like to start my style profile.' })
      });

      const data = await response.json();
      
      if (!response.ok) {
        handleApiError(data, 'Failed to start conversation');
        return;
      }
      
      setIsTyping(false);
      setChatState(prev => ({
        ...prev,
        messages: [
          { role: 'user', content: 'Hello, I\'d like to start my style profile.', timestamp: new Date().toISOString() },
          { role: 'assistant', content: data.data.response, timestamp: new Date().toISOString() }
        ],
        sessionId: data.data.sessionId,
        currentStep: data.data.currentStep,
        extractedData: data.data.extractedData,
        isComplete: data.data.isComplete,
        isLoading: false,
        retryCount: 0
      }));
    } catch (error) {
      setIsTyping(false);
      handleNetworkError(error as Error);
    }
  };

  const sendMessage = async (retryMessage?: string) => {
    const messageToSend = retryMessage || inputMessage.trim();
    if (!messageToSend || chatState.isLoading) return;

    if (!retryMessage) {
      setInputMessage('');
    }
    
    // Add user message immediately (only if not retrying)
    if (!retryMessage) {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'user',
          content: messageToSend,
          timestamp: new Date().toISOString()
        }],
        isLoading: true,
        error: undefined
      }));
    } else {
      setChatState(prev => ({ ...prev, isLoading: true, error: undefined }));
    }

    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          sessionId: chatState.sessionId
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        handleApiError(data, 'Failed to send message', messageToSend);
        return;
      }
      
      setIsTyping(false);
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date().toISOString()
        }],
        sessionId: data.data.sessionId,
        currentStep: data.data.currentStep,
        extractedData: data.data.extractedData,
        isComplete: data.data.isComplete,
        isLoading: false,
        retryCount: 0
      }));
    } catch (error) {
      setIsTyping(false);
      handleNetworkError(error as Error, messageToSend);
    }
  };

  const handleApiError = (errorData: any, fallbackMessage: string, failedMessage?: string) => {
    setIsTyping(false);
    
    const error = errorData.error || {};
    const retryCount = chatState.retryCount + 1;
    
    setChatState(prev => ({
      ...prev,
      error: {
        message: error.message || fallbackMessage,
        code: error.code,
        retryable: error.retryable !== false,
        recoveryActions: error.recoveryActions || [
          {
            type: 'retry',
            label: 'Try Again',
            description: 'Retry sending your message'
          },
          {
            type: 'fallback',
            label: 'Use Questionnaire',
            description: 'Complete your profile using a structured form instead'
          }
        ]
      },
      isLoading: false,
      retryCount,
      // Remove the user message that failed to send if it was just added
      messages: failedMessage && !prev.messages.some(m => m.content === failedMessage) 
        ? prev.messages 
        : prev.messages.slice(0, -1)
    }));

    // Restore the input message so user can retry
    if (failedMessage) {
      setInputMessage(failedMessage);
    }

    onError?.(error.message || fallbackMessage);
  };

  const handleNetworkError = (error: Error, failedMessage?: string) => {
    setIsTyping(false);
    
    const retryCount = chatState.retryCount + 1;
    const isRateLimited = error.message.includes('429') || error.message.includes('rate limit');
    
    setChatState(prev => ({
      ...prev,
      error: {
        message: isRateLimited 
          ? 'Too many requests. Please wait a moment before trying again.'
          : 'Network error. Please check your connection and try again.',
        code: isRateLimited ? 'RATE_LIMITED' : 'NETWORK_ERROR',
        retryable: true,
        recoveryActions: [
          {
            type: 'retry',
            label: 'Try Again',
            description: isRateLimited ? 'Wait a moment and retry' : 'Retry sending your message'
          },
          {
            type: 'fallback',
            label: 'Use Questionnaire',
            description: 'Complete your profile using a structured form instead'
          }
        ]
      },
      isLoading: false,
      retryCount,
      // Remove the user message that failed to send
      messages: failedMessage ? prev.messages.slice(0, -1) : prev.messages
    }));

    // Restore the input message so user can retry
    if (failedMessage) {
      setInputMessage(failedMessage);
    }

    onError?.(error.message);
  };

  const handleRecoveryAction = (actionType: string) => {
    switch (actionType) {
      case 'retry':
        if (chatState.error?.code === 'SESSION_RECOVERY_AVAILABLE') {
          // Clear recovery data and start fresh
          localStorage.removeItem(`session_recovery_${userId}_onboarding`);
          setChatState(prev => ({ 
            ...prev, 
            error: undefined, 
            hasRecoveredSession: false,
            sessionId: undefined,
            messages: [],
            extractedData: {},
            currentStep: 'greeting'
          }));
          startConversation();
        } else {
          // Retry last message
          const lastUserMessage = [...chatState.messages].reverse().find(msg => msg.role === 'user');
          if (lastUserMessage) {
            sendMessage(lastUserMessage.content);
          } else if (inputMessage.trim()) {
            sendMessage();
          }
        }
        break;
      
      case 'session_recovery':
        // Continue with recovered session
        setChatState(prev => ({ ...prev, error: undefined }));
        // The session data is already loaded, just continue
        break;
      
      case 'fallback':
        setShowFallback(true);
        break;
    }
  };

  const retryLastMessage = () => {
    handleRecoveryAction('retry');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const calculateProgress = () => {
    const currentIndex = STEP_ORDER.indexOf(chatState.currentStep);
    return Math.max(0, (currentIndex / (STEP_ORDER.length - 1)) * 100);
  };

  const getExtractedDataSummary = () => {
    const data = chatState.extractedData;
    const summary = [];
    
    if (data.emotions?.length) summary.push(`${data.emotions.length} emotions`);
    if (data.archetype?.length) summary.push(`${data.archetype.length} archetypes`);
    if (data.essence?.length) summary.push(`${data.essence.length} essences`);
    if (data.lifestyle?.length) summary.push(`${data.lifestyle.length} lifestyle`);
    if (data.values?.length) summary.push(`${data.values.length} values`);
    if (data.zipCode) summary.push('location');
    if (data.maxBudget) summary.push('budget');
    
    return summary;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" role="main">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Style Profile Onboarding</CardTitle>
            <Badge variant="secondary">
              {STEP_LABELS[chatState.currentStep as keyof typeof STEP_LABELS] || chatState.currentStep}
            </Badge>
          </div>
          <div className="space-y-2">
            <Progress value={calculateProgress()} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress: {Math.round(calculateProgress())}%</span>
              {getExtractedDataSummary().length > 0 && (
                <span>Collected: {getExtractedDataSummary().join(', ')}</span>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="h-[500px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatState.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs ml-2">AI is typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Error Display */}
        {chatState.error && (
          <div className="p-4 border-t">
            <ErrorDisplay
              error={{
                code: chatState.error.code || 'CONVERSATION_ERROR',
                message: chatState.error.message,
                timestamp: new Date().toISOString(),
                requestId: `chat-${Date.now()}`,
                retryable: chatState.error.retryable !== false,
                recoveryActions: chatState.error.recoveryActions
              }}
              onRetry={() => handleRecoveryAction('retry')}
              onFallback={() => handleRecoveryAction('fallback')}
              onSessionRecovery={() => handleRecoveryAction('session_recovery')}
            />
          </div>
        )}

        {/* Input Area */}
        {!chatState.isComplete && (
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={chatState.isLoading}
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || chatState.isLoading}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {chatState.isComplete && (
          <div className="p-4 border-t bg-green-50 dark:bg-green-950/20">
            <div className="text-center space-y-2">
              <p className="text-green-700 dark:text-green-300 font-medium">
                🎉 Your style profile is complete!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                You can now proceed to photo analysis or review your profile.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Fallback Questionnaire */}
      {showFallback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Complete Your Profile - Structured Form
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Having trouble with the chat? Use this structured form to complete your style profile.
            </p>
          </CardHeader>
          <CardContent>
            <FallbackQuestionnaire
              onComplete={(data) => {
                setChatState(prev => ({
                  ...prev,
                  extractedData: data,
                  isComplete: true,
                  error: undefined
                }));
                setShowFallback(false);
              }}
              onCancel={() => setShowFallback(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Fallback questionnaire component
function FallbackQuestionnaire({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: (data: ExtractedData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<ExtractedData>({});
  const [currentSection, setCurrentSection] = useState(0);
  
  const fallbackData = FallbackService.getStructuredQuestionnaireData();
  const sections = [
    { key: 'emotions', title: 'How do you want to feel?', data: fallbackData.emotions },
    { key: 'archetype', title: 'What\'s your style personality?', data: fallbackData.archetype },
    { key: 'essence', title: 'What\'s your style essence?', data: fallbackData.essence }
  ];

  const handleSelectionChange = (sectionKey: string, selectedIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      [sectionKey]: selectedIds
    }));
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      // Collect additional data
      const zipCode = prompt('What\'s your zip code for climate preferences?');
      const budget = prompt('What\'s your maximum budget for clothing items? (enter a number)');
      
      const completeData: ExtractedData = {
        ...formData,
        zipCode: zipCode || undefined,
        maxBudget: budget ? parseInt(budget) : undefined
      };
      
      onComplete(completeData);
    }
  };

  const currentSectionData = sections[currentSection];
  const selectedValues = (formData[currentSectionData.key as keyof ExtractedData] as string[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{currentSectionData.title}</h3>
        <Badge variant="outline">
          {currentSection + 1} of {sections.length}
        </Badge>
      </div>

      <div className="grid gap-3">
        {currentSectionData.data.map((item) => (
          <label key={item.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selectedValues.includes(item.id)}
              onChange={(e) => {
                const newSelection = e.target.checked
                  ? [...selectedValues, item.id]
                  : selectedValues.filter(id => id !== item.id);
                handleSelectionChange(currentSectionData.key, newSelection);
              }}
              className="mt-1"
            />
            <div>
              <div className="font-medium">{item.label}</div>
              <div className="text-sm text-gray-600">{item.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {currentSection > 0 && (
            <Button variant="outline" onClick={() => setCurrentSection(currentSection - 1)}>
              Previous
            </Button>
          )}
          <Button 
            onClick={handleNext}
            disabled={selectedValues.length === 0}
          >
            {currentSection === sections.length - 1 ? 'Complete' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}