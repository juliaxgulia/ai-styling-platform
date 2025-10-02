import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisConfirmation } from '@/components/analysis-confirmation';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('AnalysisConfirmation Component', () => {
  const mockOnConfirm = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnRetakePhoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBodyShapeData = {
    type: 'body-shape' as const,
    analysisId: 'analysis-123',
    bodyShape: 'waist_balance' as any,
    confidence: 0.85,
    reasoning: 'Clear waist definition with balanced proportions.',
    requiresAdditionalPhoto: false,
  };

  const mockColorPaletteData = {
    type: 'color-palette' as const,
    analysisId: 'color-123',
    colorPalette: {
      season: 'True Spring' as any,
      colors: ['coral', 'peach', 'golden yellow', 'warm red'],
      characteristics: 'Warm, clear, bright colors',
      skinTone: 'Warm undertones',
      hairColor: 'Golden blonde',
      eyeColor: 'Bright blue',
    },
    confidence: 0.92,
    reasoning: 'Clear warm undertones indicate True Spring palette.',
  };

  describe('Body Shape Confirmation', () => {
    it('renders body shape confirmation interface', () => {
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      expect(screen.getByText('Confirm Your Body Shape Analysis')).toBeInTheDocument();
      expect(screen.getByText('Hourglass/Waist Balance')).toBeInTheDocument();
      expect(screen.getByText('85% Confidence')).toBeInTheDocument();
      expect(screen.getByText('Looks Good!')).toBeInTheDocument();
      expect(screen.getByText('Adjust Result')).toBeInTheDocument();
      expect(screen.getByText('Retake Photo')).toBeInTheDocument();
      expect(screen.getByText('Skip for Now')).toBeInTheDocument();
    });

    it('shows low confidence warning when requiresAdditionalPhoto is true', () => {
      const lowConfidenceData = {
        ...mockBodyShapeData,
        confidence: 0.55,
        requiresAdditionalPhoto: true,
      };

      render(
        <AnalysisConfirmation
          data={lowConfidenceData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      expect(screen.getByText('Low Confidence Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Our analysis has lower confidence/)).toBeInTheDocument();
    });

    it('handles confirmation action', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      const confirmButton = screen.getByText('Looks Good!');
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('analysis-123', null);
    });

    it('handles reject action', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      const rejectButton = screen.getByText('Skip for Now');
      await user.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalledWith('analysis-123');
    });

    it('handles retake photo action', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      const retakeButton = screen.getByText('Retake Photo');
      await user.click(retakeButton);

      expect(mockOnRetakePhoto).toHaveBeenCalled();
    });

    it('allows editing body shape selection', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      // Click adjust result
      const adjustButton = screen.getByText('Adjust Result');
      await user.click(adjustButton);

      // Should show editing interface
      expect(screen.getByText('Select the body shape that best describes you:')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Select a different body shape
      const pearShapeButton = screen.getByText('Pear/Lower Balance');
      await user.click(pearShapeButton);

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('analysis-123', { bodyShape: 'lower_balance' });
    });

    it('allows canceling edit mode', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      // Enter edit mode
      const adjustButton = screen.getByText('Adjust Result');
      await user.click(adjustButton);

      // Cancel editing
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Should return to normal view
      expect(screen.getByText('Hourglass/Waist Balance')).toBeInTheDocument();
      expect(screen.getByText('Looks Good!')).toBeInTheDocument();
    });
  });

  describe('Color Palette Confirmation', () => {
    it('renders color palette confirmation interface', () => {
      render(
        <AnalysisConfirmation
          data={mockColorPaletteData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      expect(screen.getByText('Confirm Your Color Palette Analysis')).toBeInTheDocument();
      expect(screen.getByText('True Spring')).toBeInTheDocument();
      expect(screen.getByText('Warm, clear, bright colors')).toBeInTheDocument();
      expect(screen.getByText('92% Confidence')).toBeInTheDocument();
    });

    it('shows low confidence warning for color palette', () => {
      const lowConfidenceData = {
        ...mockColorPaletteData,
        confidence: 0.65,
      };

      render(
        <AnalysisConfirmation
          data={lowConfidenceData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      expect(screen.getByText('Lower Confidence Analysis')).toBeInTheDocument();
    });

    it('displays color preview swatches', () => {
      render(
        <AnalysisConfirmation
          data={mockColorPaletteData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      expect(screen.getByText('Your Colors')).toBeInTheDocument();
      
      // Check for color names
      expect(screen.getByText('coral')).toBeInTheDocument();
      expect(screen.getByText('peach')).toBeInTheDocument();
    });

    it('allows editing color palette selection', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockColorPaletteData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      // Click adjust result
      const adjustButton = screen.getByText('Adjust Result');
      await user.click(adjustButton);

      // Should show editing interface
      expect(screen.getByText('Select the color palette that best suits you:')).toBeInTheDocument();

      // Select a different palette
      const deepWinterButton = screen.getByText('Deep Winter');
      await user.click(deepWinterButton);

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('color-123', { colorPalette: 'Deep Winter' });
    });

    it('handles color palette confirmation', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockColorPaletteData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      const confirmButton = screen.getByText('Looks Good!');
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('color-123', null);
    });
  });

  describe('Loading States', () => {
    it('disables buttons when isSubmitting is true', () => {
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
          isSubmitting={true}
        />
      );

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('shows saving state in edit mode', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      // Enter edit mode
      const adjustButton = screen.getByText('Adjust Result');
      await user.click(adjustButton);

      // Select a shape
      const pearShapeButton = screen.getByText('Pear/Lower Balance');
      await user.click(pearShapeButton);

      // Re-render with isSubmitting true
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
          isSubmitting={true}
        />
      );

      // Should show saving state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Analysis Details', () => {
    it('displays analysis reasoning for body shape', () => {
      render(
        <AnalysisConfirmation
          data={mockBodyShapeData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      expect(screen.getByText('Analysis Details:')).toBeInTheDocument();
      expect(screen.getByText(mockBodyShapeData.reasoning)).toBeInTheDocument();
    });

    it('displays analysis reasoning for color palette', () => {
      render(
        <AnalysisConfirmation
          data={mockColorPaletteData}
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onRetakePhoto={mockOnRetakePhoto}
        />
      );

      expect(screen.getByText('Analysis Details:')).toBeInTheDocument();
      expect(screen.getByText(mockColorPaletteData.reasoning)).toBeInTheDocument();
    });
  });
});