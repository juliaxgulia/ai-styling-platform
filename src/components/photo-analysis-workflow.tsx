'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { PhotoUpload } from './photo-upload';
import { AnalysisResults } from './analysis-results';
import { AnalysisConfirmation } from './analysis-confirmation';
import { SilhouetteTag, ColorPaletteTag } from '@/types/schemas';

type AnalysisType = 'body' | 'portrait';
type WorkflowStep = 'upload' | 'analyzing' | 'results' | 'confirmation' | 'complete';

interface BodyShapeAnalysisResult {
  bodyShape: SilhouetteTag;
  confidence: number;
  reasoning: string;
  analysisId: string;
  requiresAdditionalPhoto: boolean;
}

interface ColorPaletteAnalysisResult {
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

interface PhotoAnalysisWorkflowProps {
  analysisType: AnalysisType;
  onComplete: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function PhotoAnalysisWorkflow({ 
  analysisType, 
  onComplete, 
  onError,
  className = '' 
}: PhotoAnalysisWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getStepProgress = () => {
    const steps = ['upload', 'analyzing', 'results', 'confirmation', 'complete'];
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100;
  };

  const getStepTitle = () => {
    const titles = {
      upload: `Upload ${analysisType === 'body' ? 'Full Body' : 'Portrait'} Photo`,
      analyzing: 'Analyzing Your Photo',
      results: 'Analysis Results',
      confirmation: 'Confirm Results',
      complete: 'Analysis Complete'
    };
    return titles[currentStep];
  };

  const handleUploadComplete = async (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
    setCurrentStep('analyzing');
    setIsProcessing(true);
    setError(null);

    try {
      // Call the appropriate analysis API
      const endpoint = analysisType === 'body' 
        ? '/api/analysis/body-shape' 
        : '/api/analysis/color-palette';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          userId: 'current-user' // This should come from auth context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setCurrentStep('results');

    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setError(errorMessage);
      onError?.(errorMessage);
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadError = (error: string) => {
    setError(error);
    onError?.(error);
  };

  const handleViewResults = () => {
    setCurrentStep('confirmation');
  };

  const handleConfirmResult = async (analysisId: string, adjustedData?: any) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Call confirmation API
      const response = await fetch('/api/analysis/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
          confirmed: true,
          adjustedData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save confirmation');
      }

      const result = await response.json();
      setCurrentStep('complete');
      onComplete(adjustedData || analysisResult);

    } catch (error) {
      console.error('Confirmation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save results';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectResult = async (analysisId: string) => {
    setIsProcessing(true);
    
    try {
      // Call confirmation API with rejected status
      await fetch('/api/analysis/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
          confirmed: false
        }),
      });

      // Reset to upload step
      resetWorkflow();

    } catch (error) {
      console.error('Rejection error:', error);
      // Still reset workflow even if API call fails
      resetWorkflow();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetakePhoto = () => {
    resetWorkflow();
  };

  const resetWorkflow = () => {
    setCurrentStep('upload');
    setUploadedImageUrl(null);
    setAnalysisResult(null);
    setError(null);
    setIsProcessing(false);
  };

  const startOver = () => {
    resetWorkflow();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {getStepTitle()}
            </CardTitle>
            {currentStep !== 'complete' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={startOver}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Start Over
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(getStepProgress())}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {currentStep === 'upload' && (
        <PhotoUpload
          analysisType={analysisType}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          isUploading={isProcessing}
        />
      )}

      {currentStep === 'analyzing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Analyzing Your Photo
                </h3>
                <p className="text-muted-foreground">
                  Our AI is examining your photo to determine your{' '}
                  {analysisType === 'body' ? 'body shape' : 'color palette'}. 
                  This usually takes 10-30 seconds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'results' && analysisResult && (
        <div className="space-y-4">
          <AnalysisResults
            type={analysisType === 'body' ? 'body-shape' : 'color-palette'}
            result={analysisResult}
            imageUrl={uploadedImageUrl || undefined}
          />
          
          <div className="flex justify-center">
            <Button 
              onClick={handleViewResults}
              className="flex items-center gap-2"
            >
              Review & Confirm
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'confirmation' && analysisResult && (
        <AnalysisConfirmation
          data={{
            type: analysisType === 'body' ? 'body-shape' : 'color-palette',
            ...analysisResult
          } as any}
          onConfirm={handleConfirmResult}
          onReject={handleRejectResult}
          onRetakePhoto={handleRetakePhoto}
          isSubmitting={isProcessing}
        />
      )}

      {currentStep === 'complete' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Analysis Complete!
                </h3>
                <p className="text-muted-foreground">
                  Your {analysisType === 'body' ? 'body shape' : 'color palette'} analysis 
                  has been saved to your profile. You can view and update it anytime 
                  in your profile settings.
                </p>
              </div>
              <Button onClick={startOver} variant="outline">
                Analyze Another Photo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}