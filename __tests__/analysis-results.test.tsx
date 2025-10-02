import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnalysisResults } from '@/components/analysis-results';
import { SilhouetteTag, ColorPaletteTag } from '@/types/schemas';

describe('AnalysisResults Component', () => {
  const mockBodyShapeResult = {
    bodyShape: 'waist_balance' as SilhouetteTag,
    confidence: 0.85,
    reasoning: 'The analysis shows clear waist definition with balanced shoulders and hips.',
    analysisId: 'analysis-123',
    requiresAdditionalPhoto: false,
  };

  const mockColorPaletteResult = {
    analysisId: 'color-123',
    colorPalette: {
      season: 'True Spring' as ColorPaletteTag,
      colors: ['coral', 'peach', 'golden yellow', 'warm red', 'turquoise', 'bright green', 'ivory', 'camel'],
      characteristics: 'Warm, clear, bright colors',
      skinTone: 'Warm undertones with peachy complexion',
      hairColor: 'Golden blonde with warm highlights',
      eyeColor: 'Bright blue with golden flecks',
    },
    confidence: 0.92,
    reasoning: 'Clear warm undertones in skin, golden hair, and bright eyes indicate True Spring palette.',
    recommendations: {
      bestColors: ['coral', 'peach', 'golden yellow', 'warm red'],
      avoidColors: ['black', 'pure white', 'burgundy', 'navy'],
      tips: [
        'Wear colors close to your face for maximum impact',
        'Combine warm colors for a harmonious look',
        'Use coral or peach as your signature color',
        'Avoid black near your face - use warm navy instead'
      ],
    },
  };

  describe('Body Shape Analysis Results', () => {
    it('renders body shape analysis with high confidence', () => {
      render(
        <AnalysisResults
          type="body-shape"
          result={mockBodyShapeResult}
          imageUrl="https://example.com/image.jpg"
        />
      );

      expect(screen.getByText('Body Shape Analysis Results')).toBeInTheDocument();
      expect(screen.getByText('Hourglass/Waist Balance')).toBeInTheDocument();
      expect(screen.getByText('High Confidence (85%)')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText(mockBodyShapeResult.reasoning)).toBeInTheDocument();
    });

    it('renders body shape analysis with low confidence warning', () => {
      const lowConfidenceResult = {
        ...mockBodyShapeResult,
        confidence: 0.55,
        requiresAdditionalPhoto: true,
      };

      render(
        <AnalysisResults
          type="body-shape"
          result={lowConfidenceResult}
        />
      );

      expect(screen.getByText('Low Confidence (55%)')).toBeInTheDocument();
      expect(screen.getByText('Additional Photo Recommended')).toBeInTheDocument();
      expect(screen.getByText(/The confidence level is below our threshold/)).toBeInTheDocument();
    });

    it('displays correct body shape information for different shapes', () => {
      const appleShapeResult = {
        ...mockBodyShapeResult,
        bodyShape: 'middle_balance' as SilhouetteTag,
      };

      render(
        <AnalysisResults
          type="body-shape"
          result={appleShapeResult}
        />
      );

      expect(screen.getByText('Apple/Middle Balance')).toBeInTheDocument();
      expect(screen.getByText(/Your midsection is the widest part/)).toBeInTheDocument();
    });

    it('renders image preview when imageUrl is provided', () => {
      render(
        <AnalysisResults
          type="body-shape"
          result={mockBodyShapeResult}
          imageUrl="https://example.com/image.jpg"
        />
      );

      const image = screen.getByAltText('Analyzed photo');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  });

  describe('Color Palette Analysis Results', () => {
    it('renders color palette analysis with high confidence', () => {
      render(
        <AnalysisResults
          type="color-palette"
          result={mockColorPaletteResult}
          imageUrl="https://example.com/portrait.jpg"
        />
      );

      expect(screen.getByText('Color Palette Analysis Results')).toBeInTheDocument();
      expect(screen.getByText('True Spring')).toBeInTheDocument();
      expect(screen.getByText('Warm, clear, bright colors')).toBeInTheDocument();
      expect(screen.getByText('High Confidence (92%)')).toBeInTheDocument();
    });

    it('displays color analysis details correctly', () => {
      render(
        <AnalysisResults
          type="color-palette"
          result={mockColorPaletteResult}
        />
      );

      expect(screen.getByText('Warm undertones with peachy complexion')).toBeInTheDocument();
      expect(screen.getByText('Golden blonde with warm highlights')).toBeInTheDocument();
      expect(screen.getByText('Bright blue with golden flecks')).toBeInTheDocument();
    });

    it('renders color palette swatches', () => {
      render(
        <AnalysisResults
          type="color-palette"
          result={mockColorPaletteResult}
        />
      );

      expect(screen.getByText('Your Color Palette')).toBeInTheDocument();
      
      // Check for some of the color names (using getAllByText since colors appear in multiple places)
      expect(screen.getAllByText('coral')).toHaveLength(2); // In palette and best colors
      expect(screen.getAllByText('peach')).toHaveLength(2);
      expect(screen.getByText('golden yellow')).toBeInTheDocument();
    });

    it('displays best colors recommendations', () => {
      render(
        <AnalysisResults
          type="color-palette"
          result={mockColorPaletteResult}
        />
      );

      expect(screen.getByText('Best Colors for You')).toBeInTheDocument();
      
      // Check for best color badges (some colors appear in multiple places)
      const bestColors = mockColorPaletteResult.recommendations.bestColors;
      bestColors.forEach(color => {
        expect(screen.getAllByText(color).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays colors to avoid', () => {
      render(
        <AnalysisResults
          type="color-palette"
          result={mockColorPaletteResult}
        />
      );

      expect(screen.getByText('Colors to Avoid')).toBeInTheDocument();
      
      // Check for avoid color badges
      const avoidColors = mockColorPaletteResult.recommendations.avoidColors;
      avoidColors.forEach(color => {
        expect(screen.getByText(color)).toBeInTheDocument();
      });
    });

    it('displays styling tips', () => {
      render(
        <AnalysisResults
          type="color-palette"
          result={mockColorPaletteResult}
        />
      );

      expect(screen.getByText('Styling Tips')).toBeInTheDocument();
      
      // Check for styling tips
      mockColorPaletteResult.recommendations.tips.forEach(tip => {
        expect(screen.getByText(tip)).toBeInTheDocument();
      });
    });

    it('displays analysis reasoning', () => {
      render(
        <AnalysisResults
          type="color-palette"
          result={mockColorPaletteResult}
        />
      );

      expect(screen.getByText('Analysis Details')).toBeInTheDocument();
      expect(screen.getByText(mockColorPaletteResult.reasoning)).toBeInTheDocument();
    });
  });

  describe('Confidence Level Display', () => {
    it('shows high confidence with green styling', () => {
      render(
        <AnalysisResults
          type="body-shape"
          result={{ ...mockBodyShapeResult, confidence: 0.9 }}
        />
      );

      const confidenceBadge = screen.getByText('High Confidence (90%)');
      expect(confidenceBadge).toBeInTheDocument();
    });

    it('shows medium confidence with yellow styling', () => {
      render(
        <AnalysisResults
          type="body-shape"
          result={{ ...mockBodyShapeResult, confidence: 0.7 }}
        />
      );

      const confidenceBadge = screen.getByText('Medium Confidence (70%)');
      expect(confidenceBadge).toBeInTheDocument();
    });

    it('shows low confidence with red styling', () => {
      render(
        <AnalysisResults
          type="body-shape"
          result={{ ...mockBodyShapeResult, confidence: 0.5 }}
        />
      );

      const confidenceBadge = screen.getByText('Low Confidence (50%)');
      expect(confidenceBadge).toBeInTheDocument();
    });
  });
});