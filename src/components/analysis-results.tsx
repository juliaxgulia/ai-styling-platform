'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Palette, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Eye,
  Shirt
} from 'lucide-react';
import { SilhouetteTag, ColorPaletteTag } from '@/types/schemas';

interface BodyShapeResult {
  bodyShape: SilhouetteTag;
  confidence: number;
  reasoning: string;
  analysisId: string;
  requiresAdditionalPhoto: boolean;
}

interface ColorPaletteResult {
  analysisId: string;
  colorPalette: {
    season: ColorPaletteTag;
    colors: string[];
    characteristics: string;
    skinTone: string;
    hairColor: string;
    eyeColor: string;
  };
  confidence: number;
  reasoning: string;
  recommendations: {
    bestColors: string[];
    avoidColors: string[];
    tips: string[];
  };
}

interface AnalysisResultsProps {
  type: 'body-shape' | 'color-palette';
  result: BodyShapeResult | ColorPaletteResult;
  imageUrl?: string;
  className?: string;
}

export function AnalysisResults({ type, result, imageUrl, className = '' }: AnalysisResultsProps) {
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return { level: 'High', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (confidence >= 0.6) return { level: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Low', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const confidenceInfo = getConfidenceLevel(result.confidence);
  const confidencePercentage = Math.round(result.confidence * 100);

  const formatBodyShape = (bodyShape: SilhouetteTag): string => {
    const shapeMap: Record<SilhouetteTag, string> = {
      'middle_balance': 'Apple/Middle Balance',
      'lower_balance': 'Pear/Lower Balance', 
      'waist_balance': 'Hourglass/Waist Balance',
      'upper_balance': 'Inverted Triangle/Upper Balance',
      'equal_balance': 'Rectangle/Equal Balance'
    };
    return shapeMap[bodyShape] || bodyShape;
  };

  if (type === 'body-shape') {
    const bodyResult = result as BodyShapeResult;
    
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Body Shape Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Preview */}
            {imageUrl && (
              <div className="flex justify-center">
                <img
                  src={imageUrl}
                  alt="Analyzed photo"
                  className="max-w-xs rounded-lg border"
                />
              </div>
            )}

            {/* Main Result */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Shirt className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">
                  {formatBodyShape(bodyResult.bodyShape)}
                </h3>
              </div>
              <Badge variant="secondary" className={confidenceInfo.bgColor}>
                {confidenceInfo.level} Confidence ({confidencePercentage}%)
              </Badge>
            </div>

            {/* Confidence Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analysis Confidence</span>
                <span className={confidenceInfo.color}>{confidencePercentage}%</span>
              </div>
              <Progress value={confidencePercentage} className="h-2" />
            </div>

            {/* Low Confidence Warning */}
            {bodyResult.requiresAdditionalPhoto && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-medium mb-1">Additional Photo Recommended</p>
                    <p className="text-sm">
                      The confidence level is below our threshold. Consider uploading another photo 
                      with better lighting or a clearer view for more accurate results.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* AI Reasoning */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Analysis Details
              </h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {bodyResult.reasoning}
              </p>
            </div>

            {/* Body Shape Information */}
            <div className="space-y-2">
              <h4 className="font-medium">About Your Body Shape</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                {bodyResult.bodyShape === 'middle_balance' && (
                  <p>Apple/Middle Balance: Your midsection is the widest part of your body. Focus on creating vertical lines and drawing attention to your legs and décolletage.</p>
                )}
                {bodyResult.bodyShape === 'lower_balance' && (
                  <p>Pear/Lower Balance: Your hips are wider than your shoulders. Balance your proportions by adding volume to your upper body and choosing A-line silhouettes.</p>
                )}
                {bodyResult.bodyShape === 'waist_balance' && (
                  <p>Hourglass/Waist Balance: Your shoulders and hips are similar in width with a defined waist. Emphasize your waistline with fitted styles and belted pieces.</p>
                )}
                {bodyResult.bodyShape === 'upper_balance' && (
                  <p>Inverted Triangle/Upper Balance: Your shoulders are broader than your hips. Balance your silhouette by adding volume to your lower body and choosing wider leg pants.</p>
                )}
                {bodyResult.bodyShape === 'equal_balance' && (
                  <p>Rectangle/Equal Balance: Your shoulders, waist, and hips are similar in width. Create curves and definition with layering, belts, and structured pieces.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Color Palette Results
  const colorResult = result as ColorPaletteResult;
  
  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Palette Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Preview */}
          {imageUrl && (
            <div className="flex justify-center">
              <img
                src={imageUrl}
                alt="Analyzed photo"
                className="max-w-xs rounded-lg border"
              />
            </div>
          )}

          {/* Main Result */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-bold">
                {colorResult.colorPalette.season}
              </h3>
            </div>
            <p className="text-muted-foreground">
              {colorResult.colorPalette.characteristics}
            </p>
            <Badge variant="secondary" className={confidenceInfo.bgColor}>
              {confidenceInfo.level} Confidence ({confidencePercentage}%)
            </Badge>
          </div>

          {/* Confidence Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analysis Confidence</span>
              <span className={confidenceInfo.color}>{confidencePercentage}%</span>
            </div>
            <Progress value={confidencePercentage} className="h-2" />
          </div>

          {/* Color Analysis Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Skin Tone
              </h4>
              <p className="text-sm text-muted-foreground">
                {colorResult.colorPalette.skinTone}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Hair Color</h4>
              <p className="text-sm text-muted-foreground">
                {colorResult.colorPalette.hairColor}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Eye Color</h4>
              <p className="text-sm text-muted-foreground">
                {colorResult.colorPalette.eyeColor}
              </p>
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-3">
            <h4 className="font-medium">Your Color Palette</h4>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {colorResult.colorPalette.colors.map((color, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-muted mx-auto mb-1"
                    style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, '') }}
                    title={color}
                  />
                  <p className="text-xs text-muted-foreground truncate">
                    {color}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Best Colors */}
          <div className="space-y-3">
            <h4 className="font-medium text-green-700">Best Colors for You</h4>
            <div className="flex flex-wrap gap-2">
              {colorResult.recommendations.bestColors.map((color, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                  {color}
                </Badge>
              ))}
            </div>
          </div>

          {/* Colors to Avoid */}
          <div className="space-y-3">
            <h4 className="font-medium text-red-700">Colors to Avoid</h4>
            <div className="flex flex-wrap gap-2">
              {colorResult.recommendations.avoidColors.map((color, index) => (
                <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                  {color}
                </Badge>
              ))}
            </div>
          </div>

          {/* Styling Tips */}
          <div className="space-y-3">
            <h4 className="font-medium">Styling Tips</h4>
            <ul className="space-y-2">
              {colorResult.recommendations.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Reasoning */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Analysis Details
            </h4>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              {colorResult.reasoning}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}