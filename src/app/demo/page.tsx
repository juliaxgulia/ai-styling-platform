'use client';

import React, { useState } from 'react';
import { PhotoAnalysisWorkflow } from '@/components/photo-analysis-workflow';
import { OnboardingChat } from '@/components/onboarding-chat';
import { ProfileManagement } from '@/components/profile-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DemoPage() {
  const [activeDemo, setActiveDemo] = useState<'body' | 'portrait' | 'onboarding' | 'profile' | null>(null);
  const [completedAnalyses, setCompletedAnalyses] = useState<any[]>([]);

  const handleAnalysisComplete = (result: any) => {
    setCompletedAnalyses(prev => [...prev, { 
      type: activeDemo, 
      result, 
      timestamp: new Date().toISOString() 
    }]);
    setActiveDemo(null);
  };

  const handleAnalysisError = (error: string) => {
    console.error('Analysis error:', error);
    // In a real app, you'd show a toast or error message
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Photo Analysis Demo</h1>
        <p className="text-lg text-muted-foreground">
          Test the photo upload and analysis interface components
        </p>
      </div>

      {!activeDemo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Onboarding Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Experience the conversational onboarding flow to discover your personal style preferences.
              </p>
              <Button 
                onClick={() => setActiveDemo('onboarding')}
                className="w-full"
              >
                Start Onboarding
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Profile Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Review and manage your complete style profile with editing capabilities and privacy controls.
              </p>
              <Button 
                onClick={() => setActiveDemo('profile')}
                className="w-full"
              >
                Manage Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Body Shape Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Upload a full-body photo to analyze your body shape and get personalized styling recommendations.
              </p>
              <Button 
                onClick={() => setActiveDemo('body')}
                className="w-full"
              >
                Start Body Analysis
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Color Palette Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Upload a portrait photo to determine your seasonal color palette and best colors.
              </p>
              <Button 
                onClick={() => setActiveDemo('portrait')}
                className="w-full"
              >
                Start Color Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeDemo && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {activeDemo === 'onboarding' ? 'Onboarding Chat' : 
               activeDemo === 'profile' ? 'Profile Management' :
               activeDemo === 'body' ? 'Body Shape Analysis' : 'Color Palette Analysis'}
            </h2>
            <Button 
              variant="outline" 
              onClick={() => setActiveDemo(null)}
            >
              Back to Demo Selection
            </Button>
          </div>
          
          {activeDemo === 'onboarding' ? (
            <OnboardingChat
              onComplete={(extractedData) => {
                console.log('Onboarding completed:', extractedData);
                setCompletedAnalyses(prev => [...prev, { 
                  type: 'onboarding', 
                  result: extractedData, 
                  timestamp: new Date().toISOString() 
                }]);
              }}
              onError={handleAnalysisError}
            />
          ) : activeDemo === 'profile' ? (
            <ProfileManagement
              onSuccess={(message) => {
                console.log('Profile updated:', message);
              }}
              onError={handleAnalysisError}
            />
          ) : (
            <PhotoAnalysisWorkflow
              analysisType={activeDemo}
              onComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
            />
          )}
        </div>
      )}

      {completedAnalyses.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Completed Analyses</h2>
          <div className="space-y-4">
            {completedAnalyses.map((analysis, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {analysis.type === 'body' ? 'Body Shape Analysis' : 'Color Palette Analysis'}
                    </CardTitle>
                    <Badge variant="secondary">
                      {new Date(analysis.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                    {JSON.stringify(analysis.result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}