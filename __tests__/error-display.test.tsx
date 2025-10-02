// Tests for error display components

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorDisplay, InlineError } from '@/components/error-display';
import { ErrorBoundary } from '@/components/error-boundary';
import { ErrorResponse } from '@/lib/errors';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${variant} ${size} ${className}`}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: any) => <div className={className} role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span className={variant}>{children}</span>
}));

describe('ErrorDisplay Component', () => {
  const mockError: ErrorResponse['error'] = {
    code: 'AI_SERVICE_ERROR',
    message: 'AI service is temporarily unavailable',
    timestamp: '2024-01-01T00:00:00.000Z',
    requestId: 'req-123',
    retryable: true,
    retryAfter: 5000,
    recoveryActions: [
      {
        type: 'retry',
        label: 'Try Again',
        description: 'Retry the AI analysis with the same input'
      },
      {
        type: 'fallback',
        label: 'Use Structured Form',
        description: 'Complete your profile using a structured questionnaire instead'
      }
    ]
  };

  it('should render error message and title', () => {
    render(<ErrorDisplay error={mockError} />);
    
    expect(screen.getByText('AI Service Unavailable')).toBeInTheDocument();
    expect(screen.getByText('AI service is temporarily unavailable')).toBeInTheDocument();
  });

  it('should display retryable badge for retryable errors', () => {
    render(<ErrorDisplay error={mockError} />);
    
    expect(screen.getByText('Retryable')).toBeInTheDocument();
  });

  it('should display error badge for non-retryable errors', () => {
    const nonRetryableError = { ...mockError, retryable: false };
    render(<ErrorDisplay error={nonRetryableError} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should render recovery actions', () => {
    render(<ErrorDisplay error={mockError} />);
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Use Structured Form')).toBeInTheDocument();
    expect(screen.getByText('Retry the AI analysis with the same input')).toBeInTheDocument();
  });

  it('should call onRetry when retry action is clicked', () => {
    const onRetry = jest.fn();
    render(<ErrorDisplay error={mockError} onRetry={onRetry} />);
    
    fireEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onFallback when fallback action is clicked', () => {
    const onFallback = jest.fn();
    render(<ErrorDisplay error={mockError} onFallback={onFallback} />);
    
    fireEvent.click(screen.getByText('Use Structured Form'));
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('should show/hide error details when toggle is clicked', () => {
    render(<ErrorDisplay error={mockError} />);
    
    // Details should be hidden initially
    expect(screen.queryByText('Code:')).not.toBeInTheDocument();
    
    // Click to show details
    fireEvent.click(screen.getByText('Show Details'));
    expect(screen.getByText('Code:')).toBeInTheDocument();
    expect(screen.getByText('AI_SERVICE_ERROR')).toBeInTheDocument();
    expect(screen.getByText('req-123')).toBeInTheDocument();
    
    // Click to hide details
    fireEvent.click(screen.getByText('Hide Details'));
    expect(screen.queryByText('Code:')).not.toBeInTheDocument();
  });

  it('should display retry countdown for retryable errors', () => {
    render(<ErrorDisplay error={mockError} />);
    
    expect(screen.getByText(/Retry available in \d+s/)).toBeInTheDocument();
  });

  it('should handle session recovery actions', () => {
    const sessionError: ErrorResponse['error'] = {
      ...mockError,
      code: 'SESSION_EXPIRED',
      recoveryActions: [
        {
          type: 'session_recovery',
          label: 'Resume Session',
          description: 'Continue from your last saved conversation'
        }
      ]
    };

    const onSessionRecovery = jest.fn();
    render(<ErrorDisplay error={sessionError} onSessionRecovery={onSessionRecovery} />);
    
    fireEvent.click(screen.getByText('Resume Session'));
    expect(onSessionRecovery).toHaveBeenCalledTimes(1);
  });

  it('should handle manual input actions', () => {
    const photoError: ErrorResponse['error'] = {
      ...mockError,
      code: 'PHOTO_ANALYSIS_ERROR',
      recoveryActions: [
        {
          type: 'manual',
          label: 'Manual Input',
          description: 'Provide your measurements manually instead'
        }
      ]
    };

    const onManualInput = jest.fn();
    render(<ErrorDisplay error={photoError} onManualInput={onManualInput} />);
    
    fireEvent.click(screen.getByText('Manual Input'));
    expect(onManualInput).toHaveBeenCalledTimes(1);
  });

  it('should show loading state during retry', async () => {
    const onRetry = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<ErrorDisplay error={mockError} onRetry={onRetry} />);
    
    fireEvent.click(screen.getByText('Try Again'));
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /Try Again/ })).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Try Again/ })).not.toBeDisabled();
    });
  });
});

describe('InlineError Component', () => {
  it('should render inline error message', () => {
    render(<InlineError message="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<InlineError message="Error occurred" onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(<InlineError message="Error occurred" />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary Component', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should provide retry functionality', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Error boundary should be showing
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Should have retry button
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should provide go home functionality', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Should have go home button
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('should provide error reporting functionality', () => {
    // Mock alert
    const mockAlert = jest.fn();
    global.alert = mockAlert;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Report Issue'));
    expect(mockAlert).toHaveBeenCalledWith('Error reported. Thank you for helping us improve!');
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Error Details:')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should hide error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.queryByText('Error Details:')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('Error Component Integration', () => {
  it('should handle complete error recovery flow', async () => {
    const mockRetry = jest.fn().mockResolvedValue('Success');

    const error: ErrorResponse['error'] = {
      code: 'AI_SERVICE_ERROR',
      message: 'Service temporarily unavailable',
      timestamp: new Date().toISOString(),
      requestId: 'req-123',
      retryable: true,
      recoveryActions: [
        {
          type: 'retry',
          label: 'Try Again',
          description: 'Retry the operation'
        }
      ]
    };

    render(<ErrorDisplay error={error} onRetry={mockRetry} />);
    
    // Click retry button
    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle different error types with appropriate icons and colors', () => {
    const errors = [
      { code: 'AI_SERVICE_ERROR', expectedTitle: 'AI Service Unavailable' },
      { code: 'PHOTO_ANALYSIS_ERROR', expectedTitle: 'Photo Analysis Failed' },
      { code: 'SESSION_EXPIRED', expectedTitle: 'Session Expired' },
      { code: 'VALIDATION_ERROR', expectedTitle: 'Input Validation Error' },
      { code: 'UNKNOWN_ERROR', expectedTitle: 'Unexpected Error' }
    ];

    errors.forEach(({ code, expectedTitle }) => {
      const error: ErrorResponse['error'] = {
        code,
        message: 'Test message',
        timestamp: new Date().toISOString(),
        requestId: 'req-123'
      };

      const { unmount } = render(<ErrorDisplay error={error} />);
      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      unmount();
    });
  });
});