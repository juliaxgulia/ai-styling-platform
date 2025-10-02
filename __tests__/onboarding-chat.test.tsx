import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { OnboardingChat } from '@/components/onboarding-chat';

// Mock fetch
global.fetch = jest.fn();

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('OnboardingChat', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders chat interface with progress header', () => {
    render(<OnboardingChat />);
    
    expect(screen.getByText('Style Profile Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('starts conversation automatically on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Hello! I\'m excited to help you discover your personal style.',
        sessionId: 'test-session-id',
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false
      })
    } as Response);

    render(<OnboardingChat />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/chat/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello, I\'d like to start my style profile.' })
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Hello! I\'m excited to help you discover your personal style.')).toBeInTheDocument();
    });
  });

  it('displays typing indicator while AI is responding', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          response: 'Test response',
          sessionId: 'test-session-id',
          currentStep: 'emotions',
          extractedData: {},
          isComplete: false
        })
      } as Response), 100);
    }));

    render(<OnboardingChat />);

    await waitFor(() => {
      expect(screen.getByText('AI is typing...')).toBeInTheDocument();
    });
  });

  it('allows user to send messages', async () => {
    const user = userEvent.setup();
    
    // Mock initial conversation start
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Hello! Let\'s start.',
        sessionId: 'test-session-id',
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false
      })
    } as Response);

    // Mock user message response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Great! Tell me more about that.',
        sessionId: 'test-session-id',
        currentStep: 'emotions',
        extractedData: { emotions: ['confident'] },
        isComplete: false
      })
    } as Response);

    render(<OnboardingChat />);

    // Wait for initial conversation to load
    await waitFor(() => {
      expect(screen.getByText('Hello! Let\'s start.')).toBeInTheDocument();
    });

    // Type and send a message
    const input = screen.getByPlaceholderText('Type your response...');
    await user.type(input, 'I want to feel confident in my clothes');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('I want to feel confident in my clothes')).toBeInTheDocument();
      expect(screen.getByText('Great! Tell me more about that.')).toBeInTheDocument();
    });
  });

  it('handles Enter key to send messages', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Hello!',
        sessionId: 'test-session-id',
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false
      })
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Thanks for sharing!',
        sessionId: 'test-session-id',
        currentStep: 'archetype',
        extractedData: { emotions: ['confident'] },
        isComplete: false
      })
    } as Response);

    render(<OnboardingChat />);

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your response...');
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('updates progress as conversation advances', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Hello!',
        sessionId: 'test-session-id',
        currentStep: 'archetype',
        extractedData: { emotions: ['confident'] },
        isComplete: false
      })
    } as Response);

    render(<OnboardingChat />);

    await waitFor(() => {
      expect(screen.getByText('Personality Style')).toBeInTheDocument();
    });

    // Progress should be updated (archetype is step 2 out of 8)
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays extracted data summary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Great progress!',
        sessionId: 'test-session-id',
        currentStep: 'essence',
        extractedData: {
          emotions: ['confident', 'powerful'],
          archetype: ['hero'],
          zipCode: '12345'
        },
        isComplete: false
      })
    } as Response);

    render(<OnboardingChat />);

    await waitFor(() => {
      expect(screen.getByText(/Collected: 2 emotions, 1 archetypes, location/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const onError = jest.fn();
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<OnboardingChat onError={onError} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to start conversation/)).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith('Failed to start conversation. Please try again.');
    });
  });

  it('allows retry on failed messages', async () => {
    const user = userEvent.setup();
    
    // Initial successful conversation start
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Hello!',
        sessionId: 'test-session-id',
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false
      })
    } as Response);

    render(<OnboardingChat />);

    // Wait for initial conversation
    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });

    // Failed message
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Send a message that will fail
    const input = screen.getByPlaceholderText('Type your response...');
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to send message. Please try again.')).toBeInTheDocument();
    });

    // Click retry button
    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Message should be restored to input
    expect(input).toHaveValue('Test message');
  });

  it('shows completion message when onboarding is finished', async () => {
    const onComplete = jest.fn();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Perfect! Your style profile is now complete.',
        sessionId: 'test-session-id',
        currentStep: 'complete',
        extractedData: {
          emotions: ['confident'],
          archetype: ['hero'],
          essence: ['classic'],
          lifestyle: ['professional'],
          values: ['quality'],
          zipCode: '12345',
          maxBudget: 500
        },
        isComplete: true
      })
    } as Response);

    render(<OnboardingChat onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByText('Perfect! Your style profile is now complete.')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('🎉 Your style profile is complete!')).toBeInTheDocument();
      expect(screen.getByText('You can now proceed to photo analysis or review your profile.')).toBeInTheDocument();
      expect(onComplete).toHaveBeenCalledWith({
        emotions: ['confident'],
        archetype: ['hero'],
        essence: ['classic'],
        lifestyle: ['professional'],
        values: ['quality'],
        zipCode: '12345',
        maxBudget: 500
      });
    });

    // Input should be hidden when complete
    expect(screen.queryByPlaceholderText('Type your response...')).not.toBeInTheDocument();
  });

  it('disables input and send button while loading', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<OnboardingChat />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your response...');
      expect(input).toBeDisabled();
    });
  });

  it('displays message timestamps', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Hello!',
        sessionId: 'test-session-id',
        currentStep: 'emotions',
        extractedData: {},
        isComplete: false
      })
    } as Response);

    render(<OnboardingChat />);

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });

    // Should show timestamps for messages - look for time pattern in the DOM
    const timePattern = /\d{1,2}:\d{2}:\d{2}/;
    await waitFor(() => {
      const allText = screen.getByRole('main') || document.body;
      expect(allText.textContent).toMatch(timePattern);
    });
  });
});