import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoAnalysisWorkflow } from '@/components/photo-analysis-workflow';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the child components
jest.mock('@/components/photo-upload', () => ({
  PhotoUpload: ({ onUploadComplete, onUploadError }: any) => (
    <div data-testid="photo-upload">
      <button onClick={() => onUploadComplete('https://example.com/image.jpg')}>
        Mock Upload Complete
      </button>
      <button onClick={() => onUploadError('Upload failed')}>
        Mock Upload Error
      </button>
    </div>
  ),
}));

jest.mock('@/components/analysis-results', () => ({
  AnalysisResults: ({ result }: any) => (
    <div data-testid="analysis-results">
      Analysis Results: {result?.bodyShape || result?.colorPalette?.season}
    </div>
  ),
}));

jest.mock('@/components/analysis-confirmation', () => ({
  AnalysisConfirmation: ({ onConfirm, onReject, onRetakePhoto }: any) => (
    <div data-testid="analysis-confirmation">
      <button onClick={() => onConfirm('analysis-123', null)}>Confirm</button>
      <button onClick={() => onReject('analysis-123')}>Reject</button>
      <button onClick={() => onRetakePhoto()}>Retake</button>
    </div>
  ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PhotoAnalysisWorkflow Component', () => {
  const mockOnComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  const defaultProps = {
    analysisType: 'body' as const,
    onComplete: mockOnComplete,
    onError: mockOnError,
  };

  it('renders initial upload step', () => {
    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    expect(screen.getByText('Upload Full Body Photo')).toBeInTheDocument();
    expect(screen.getByTestId('photo-upload')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument(); // First step progress
  });

  it('renders portrait analysis title for portrait type', () => {
    render(<PhotoAnalysisWorkflow {...defaultProps} analysisType="portrait" />);
    
    expect(screen.getByText('Upload Portrait Photo')).toBeInTheDocument();
  });

  it('progresses to analyzing step after upload', async () => {
    const user = userEvent.setup();
    
    // Mock successful analysis API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        bodyShape: 'waist_balance',
        confidence: 0.85,
        reasoning: 'Analysis complete',
        analysisId: 'analysis-123',
        requiresAdditionalPhoto: false,
      }),
    });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Trigger upload complete
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    // Should show analyzing step
    expect(screen.getByText('Analyzing Your Photo')).toBeInTheDocument();
    expect(screen.getByText(/Our AI is examining your photo/)).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument(); // Analyzing step progress
  });

  it('handles body shape analysis successfully', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        bodyShape: 'waist_balance',
        confidence: 0.85,
        reasoning: 'Analysis complete',
        analysisId: 'analysis-123',
        requiresAdditionalPhoto: false,
      }),
    });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Trigger upload complete
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/body-shape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: 'https://example.com/image.jpg',
        userId: 'current-user',
      }),
    });

    expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument(); // Results step progress
  });

  it('handles color palette analysis successfully', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        analysisId: 'color-123',
        colorPalette: {
          season: 'True Spring',
          colors: ['coral', 'peach'],
          characteristics: 'Warm colors',
        },
        confidence: 0.92,
        reasoning: 'Color analysis complete',
      }),
    });

    render(<PhotoAnalysisWorkflow {...defaultProps} analysisType="portrait" />);
    
    // Trigger upload complete
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/color-palette', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: 'https://example.com/image.jpg',
        userId: 'current-user',
      }),
    });
  });

  it('handles analysis API errors', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: { message: 'Analysis failed' },
      }),
    });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Trigger upload complete
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Analysis failed');
    });

    // Should return to upload step
    expect(screen.getByText('Upload Full Body Photo')).toBeInTheDocument();
  });

  it('progresses to confirmation step', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        bodyShape: 'waist_balance',
        confidence: 0.85,
        reasoning: 'Analysis complete',
        analysisId: 'analysis-123',
        requiresAdditionalPhoto: false,
      }),
    });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Complete upload and analysis
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    // Click review & confirm
    const reviewButton = screen.getByText('Review & Confirm');
    await user.click(reviewButton);

    expect(screen.getByText('Confirm Results')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-confirmation')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument(); // Confirmation step progress
  });

  it('handles confirmation successfully', async () => {
    const user = userEvent.setup();
    
    // Mock analysis response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          bodyShape: 'waist_balance',
          confidence: 0.85,
          reasoning: 'Analysis complete',
          analysisId: 'analysis-123',
          requiresAdditionalPhoto: false,
        }),
      })
      // Mock confirmation response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Complete workflow to confirmation step
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    const reviewButton = screen.getByText('Review & Confirm');
    await user.click(reviewButton);

    // Confirm the analysis
    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Complete!')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId: 'analysis-123',
        confirmed: true,
        adjustedData: null,
      }),
    });

    expect(mockOnComplete).toHaveBeenCalled();
    expect(screen.getByText('100%')).toBeInTheDocument(); // Complete step progress
  });

  it('handles rejection and resets workflow', async () => {
    const user = userEvent.setup();
    
    // Mock analysis and rejection responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          bodyShape: 'waist_balance',
          confidence: 0.85,
          reasoning: 'Analysis complete',
          analysisId: 'analysis-123',
          requiresAdditionalPhoto: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Complete workflow to confirmation step
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    const reviewButton = screen.getByText('Review & Confirm');
    await user.click(reviewButton);

    // Reject the analysis
    const rejectButton = screen.getByText('Reject');
    await user.click(rejectButton);

    await waitFor(() => {
      expect(screen.getByText('Upload Full Body Photo')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/analysis/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId: 'analysis-123',
        confirmed: false,
      }),
    });
  });

  it('handles retake photo action', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        bodyShape: 'waist_balance',
        confidence: 0.85,
        reasoning: 'Analysis complete',
        analysisId: 'analysis-123',
        requiresAdditionalPhoto: false,
      }),
    });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Complete workflow to confirmation step
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    const reviewButton = screen.getByText('Review & Confirm');
    await user.click(reviewButton);

    // Retake photo
    const retakeButton = screen.getByText('Retake');
    await user.click(retakeButton);

    // Should reset to upload step
    expect(screen.getByText('Upload Full Body Photo')).toBeInTheDocument();
    expect(screen.getByTestId('photo-upload')).toBeInTheDocument();
  });

  it('allows starting over from any step', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        bodyShape: 'waist_balance',
        confidence: 0.85,
        reasoning: 'Analysis complete',
        analysisId: 'analysis-123',
        requiresAdditionalPhoto: false,
      }),
    });

    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Progress to results step
    const uploadCompleteButton = screen.getByText('Mock Upload Complete');
    await user.click(uploadCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    });

    // Click start over
    const startOverButton = screen.getByText('Start Over');
    await user.click(startOverButton);

    // Should reset to upload step
    expect(screen.getByText('Upload Full Body Photo')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('handles upload errors', async () => {
    const user = userEvent.setup();
    
    render(<PhotoAnalysisWorkflow {...defaultProps} />);
    
    // Trigger upload error
    const uploadErrorButton = screen.getByText('Mock Upload Error');
    await user.click(uploadErrorButton);

    expect(mockOnError).toHaveBeenCalledWith('Upload failed');
  });
});