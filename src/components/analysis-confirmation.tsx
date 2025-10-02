'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  X, 
  Edit3, 
  AlertTriangle,
  User,
  Palette,
  Save
} from 'lucide-react';
import { SilhouetteTag, ColorPaletteTag, SILHOUETTE_SCHEMA, COLOR_PALETTE_SCHEMA } from '@/types/schemas';

interface BodyShapeConfirmationData {
  type: 'body-shape';
  analysisId: string;
  bodyShape: SilhouetteTag;
  confidence: number;
  reasoning: string;
  requiresAdditionalPhoto: boolean;
}

interface ColorPaletteConfirmationData {
  type: 'color-palette';
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
}

interface AnalysisConfirmationProps {
  data: BodyShapeConfirmationData | ColorPaletteConfirmationData;
  onConfirm: (analysisId: string, adjustedData?: any) => void;
  onReject: (analysisId: string) => void;
  onRetakePhoto: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export function AnalysisConfirmation({ 
  data, 
  onConfirm, 
  onReject, 
  onRetakePhoto,
  isSubmitting = false,
  className = '' 
}: AnalysisConfirmationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [adjustedData, setAdjustedData] = useState<any>(null);

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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleConfirm = () => {
    onConfirm(data.analysisId, adjustedData);
  };

  const handleEdit = () => {
    setIsEditing(true);
    if (data.type === 'body-shape') {
      setAdjustedData({ bodyShape: data.bodyShape });
    } else {
      setAdjustedData({ 
        colorPalette: data.colorPalette.season 
      });
    }
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    onConfirm(data.analysisId, adjustedData);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setAdjustedData(null);
  };

  if (data.type === 'body-shape') {
    const bodyData = data as BodyShapeConfirmationData;
    
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Confirm Your Body Shape Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Low Confidence Warning */}
            {bodyData.requiresAdditionalPhoto && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-medium mb-1">Low Confidence Analysis</p>
                    <p className="text-sm">
                      Our analysis has lower confidence. You can accept the result, 
                      manually adjust it, or retake the photo for better accuracy.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Current Analysis */}
            <div className="text-center space-y-3">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Detected Body Shape
                </h3>
                {!isEditing ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-primary">
                      {formatBodyShape(bodyData.bodyShape)}
                    </p>
                    <Badge variant="secondary" className={getConfidenceColor(bodyData.confidence)}>
                      {Math.round(bodyData.confidence * 100)}% Confidence
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      Select the body shape that best describes you:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-md mx-auto">
                      {SILHOUETTE_SCHEMA.map((shape) => (
                        <Button
                          key={shape}
                          variant={adjustedData?.bodyShape === shape ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAdjustedData({ bodyShape: shape })}
                          className="text-left justify-start"
                        >
                          {formatBodyShape(shape)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isEditing ? (
                <>
                  <Button 
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Looks Good!'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleEdit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Adjust Result
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={onRetakePhoto}
                    disabled={isSubmitting}
                  >
                    Retake Photo
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => onReject(data.analysisId)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    Skip for Now
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleSaveEdit}
                    disabled={!adjustedData?.bodyShape || isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            {/* Analysis Details */}
            {!isEditing && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="font-medium mb-1">Analysis Details:</p>
                <p>{bodyData.reasoning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Color Palette Confirmation
  const colorData = data as ColorPaletteConfirmationData;
  
  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Confirm Your Color Palette Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Low Confidence Warning */}
          {colorData.confidence < 0.7 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium mb-1">Lower Confidence Analysis</p>
                  <p className="text-sm">
                    Our analysis has lower confidence. You can accept the result, 
                    manually adjust it, or retake the photo with better lighting.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Current Analysis */}
          <div className="text-center space-y-3">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Detected Color Palette
              </h3>
              {!isEditing ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-primary">
                    {colorData.colorPalette.season}
                  </p>
                  <p className="text-muted-foreground">
                    {colorData.colorPalette.characteristics}
                  </p>
                  <Badge variant="secondary" className={getConfidenceColor(colorData.confidence)}>
                    {Math.round(colorData.confidence * 100)}% Confidence
                  </Badge>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Select the color palette that best suits you:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl mx-auto">
                    {COLOR_PALETTE_SCHEMA.map((palette) => (
                      <Button
                        key={palette}
                        variant={adjustedData?.colorPalette === palette ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAdjustedData({ colorPalette: palette })}
                        className="text-left justify-start text-xs"
                      >
                        {palette}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Color Preview */}
          {!isEditing && (
            <div className="space-y-3">
              <h4 className="font-medium text-center">Your Colors</h4>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {colorData.colorPalette.colors.slice(0, 8).map((color, index) => (
                  <div key={index} className="text-center">
                    <div 
                      className="w-10 h-10 rounded-lg border-2 border-muted mx-auto mb-1"
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
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isEditing ? (
              <>
                <Button 
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isSubmitting ? 'Saving...' : 'Looks Good!'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Adjust Result
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={onRetakePhoto}
                  disabled={isSubmitting}
                >
                  Retake Photo
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={() => onReject(data.analysisId)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  Skip for Now
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={!adjustedData?.colorPalette || isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Analysis Details */}
          {!isEditing && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">Analysis Details:</p>
              <p>{colorData.reasoning}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}