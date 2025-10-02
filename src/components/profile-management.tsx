'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserProfile, StyleProfile, PhysicalProfile, UserPreferences } from '@/types/user';
import { SCHEMA_METADATA } from '@/types/schemas';
import { Edit, Save, X, Download, Shield, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';

interface ProfileManagementProps {
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface ProfileData {
  styleProfile?: StyleProfile;
  physicalProfile?: PhysicalProfile;
  preferences?: UserPreferences;
  analysisPhotos?: {
    bodyPhotoUrl?: string;
    portraitPhotoUrl?: string;
  };
  climateInfo?: {
    region: string;
    averageTemp: number;
    seasons: string[];
  };
}

interface EditingState {
  section: 'style' | 'physical' | 'preferences' | null;
  data: any;
}

export function ProfileManagement({ onError, onSuccess }: ProfileManagementProps) {
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<EditingState>({ section: null, data: null });
  const [showPhotos, setShowPhotos] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      
      // Load all profile sections
      const [styleResponse, physicalResponse, preferencesResponse] = await Promise.all([
        fetch('/api/profile/style'),
        fetch('/api/profile/physical'),
        fetch('/api/profile/preferences')
      ]);

      const styleData = styleResponse.ok ? await styleResponse.json() : null;
      const physicalData = physicalResponse.ok ? await physicalResponse.json() : null;
      const preferencesData = preferencesResponse.ok ? await preferencesResponse.json() : null;

      setProfileData({
        styleProfile: styleData?.styleProfile,
        physicalProfile: physicalData?.physicalProfile,
        preferences: preferencesData?.preferences,
        analysisPhotos: physicalData?.analysisPhotos,
        climateInfo: preferencesData?.climateInfo
      });
    } catch (error) {
      console.error('Failed to load profile data:', error);
      onError?.('Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (section: 'style' | 'physical' | 'preferences') => {
    const currentData = profileData[section === 'style' ? 'styleProfile' : section === 'physical' ? 'physicalProfile' : 'preferences'];
    setEditing({ section, data: { ...currentData } });
  };

  const cancelEditing = () => {
    setEditing({ section: null, data: null });
  };

  const saveChanges = async () => {
    if (!editing.section || !editing.data) return;

    try {
      setIsUpdating(true);
      
      const endpoint = `/api/profile/${editing.section}`;
      const payload = editing.section === 'style' 
        ? { styleProfile: editing.data }
        : editing.section === 'physical'
        ? { physicalProfile: editing.data }
        : { preferences: editing.data };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const result = await response.json();
      
      // Update local state
      setProfileData(prev => ({
        ...prev,
        [editing.section === 'style' ? 'styleProfile' : editing.section === 'physical' ? 'physicalProfile' : 'preferences']: editing.data
      }));

      setEditing({ section: null, data: null });
      onSuccess?.('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save changes:', error);
      onError?.('Failed to save changes. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateEditingData = (field: string, value: any) => {
    setEditing(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
  };

  const toggleTag = (category: string, tag: string) => {
    if (!editing.data) return;
    
    const currentTags = editing.data[category] || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];
    
    updateEditingData(category, newTags);
  };

  const exportProfile = () => {
    const exportData = {
      styleProfile: profileData.styleProfile,
      physicalProfile: profileData.physicalProfile,
      preferences: profileData.preferences,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `style-profile-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calculateCompleteness = () => {
    let totalFields = 0;
    let completedFields = 0;

    // Style profile fields
    if (profileData.styleProfile) {
      totalFields += 5; // emotions, archetype, essence, lifestyle, values
      if (profileData.styleProfile.emotions?.length) completedFields++;
      if (profileData.styleProfile.archetype?.length) completedFields++;
      if (profileData.styleProfile.essence?.length) completedFields++;
      if (profileData.styleProfile.lifestyle?.length) completedFields++;
      if (profileData.styleProfile.values?.length) completedFields++;
    }

    // Physical profile fields
    totalFields += 2; // body shape, color palette
    if (profileData.physicalProfile?.bodyShape) completedFields++;
    if (profileData.physicalProfile?.colorPalette) completedFields++;

    // Preferences fields
    totalFields += 2; // zip code, budget
    if (profileData.preferences?.zipCode) completedFields++;
    if (profileData.preferences?.maxBudget) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Style Profile</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={exportProfile}>
                <Download className="w-4 h-4 mr-2" />
                Export Profile
              </Button>
              <Button variant="outline" size="sm" onClick={loadProfileData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Profile Completeness</span>
              <span>{calculateCompleteness()}%</span>
            </div>
            <Progress value={calculateCompleteness()} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      {/* Style Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Style Preferences</CardTitle>
            {editing.section === 'style' ? (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelEditing}
                  disabled={isUpdating}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveChanges}
                  disabled={isUpdating}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => startEditing('style')}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(SCHEMA_METADATA).map(([key, schema]) => {
            if (key === 'SILHOUETTE' || key === 'COLOR_PALETTE') return null;
            
            const fieldName = key.toLowerCase() as keyof StyleProfile;
            const currentTags = editing.section === 'style' 
              ? editing.data?.[fieldName] || []
              : profileData.styleProfile?.[fieldName] || [];

            return (
              <div key={key} className="space-y-3">
                <h4 className="font-medium">{schema.name}</h4>
                <p className="text-sm text-muted-foreground">{schema.description}</p>
                
                {editing.section === 'style' ? (
                  <div className="flex flex-wrap gap-2">
                    {schema.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant={currentTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(fieldName, tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentTags.length > 0 ? (
                      currentTags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not set</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Physical Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Physical Analysis</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPhotos(!showPhotos)}
              >
                {showPhotos ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showPhotos ? 'Hide Photos' : 'Show Photos'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Body Shape</h4>
              {profileData.physicalProfile?.bodyShape ? (
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-sm">
                    {profileData.physicalProfile.bodyShape.replace('_', ' ')}
                  </Badge>
                  {profileData.physicalProfile.bodyShapeConfidence && (
                    <p className="text-sm text-muted-foreground">
                      Confidence: {Math.round(profileData.physicalProfile.bodyShapeConfidence * 100)}%
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not analyzed yet</p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Color Palette</h4>
              {profileData.physicalProfile?.colorPalette ? (
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-sm">
                    {profileData.physicalProfile.colorPalette.season}
                  </Badge>
                  {profileData.physicalProfile.colorPalette.confidence && (
                    <p className="text-sm text-muted-foreground">
                      Confidence: {Math.round(profileData.physicalProfile.colorPalette.confidence * 100)}%
                    </p>
                  )}
                  {profileData.physicalProfile.colorPalette.colors && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {profileData.physicalProfile.colorPalette.colors.slice(0, 8).map((color, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded-full border border-gray-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not analyzed yet</p>
              )}
            </div>
          </div>

          {/* Analysis Photos */}
          {showPhotos && profileData.analysisPhotos && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-medium flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Analysis Photos (Private)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData.analysisPhotos.bodyPhotoUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Body Shape Analysis</p>
                    <img
                      src={profileData.analysisPhotos.bodyPhotoUrl}
                      alt="Body shape analysis"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
                {profileData.analysisPhotos.portraitPhotoUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Color Palette Analysis</p>
                    <img
                      src={profileData.analysisPhotos.portraitPhotoUrl}
                      alt="Color palette analysis"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Preferences</CardTitle>
            {editing.section === 'preferences' ? (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelEditing}
                  disabled={isUpdating}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveChanges}
                  disabled={isUpdating}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => startEditing('preferences')}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Location & Climate</h4>
              {editing.section === 'preferences' ? (
                <input
                  type="text"
                  value={editing.data?.zipCode || ''}
                  onChange={(e) => updateEditingData('zipCode', e.target.value)}
                  placeholder="Enter zip code"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <div className="space-y-2">
                  {profileData.preferences?.zipCode ? (
                    <>
                      <Badge variant="secondary">{profileData.preferences.zipCode}</Badge>
                      {profileData.climateInfo && (
                        <p className="text-sm text-muted-foreground">
                          {profileData.climateInfo.region} • Avg {profileData.climateInfo.averageTemp}°F
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not set</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Budget Range</h4>
              {editing.section === 'preferences' ? (
                <input
                  type="number"
                  value={editing.data?.maxBudget || ''}
                  onChange={(e) => updateEditingData('maxBudget', parseInt(e.target.value) || 0)}
                  placeholder="Maximum budget per item"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <div className="space-y-2">
                  {profileData.preferences?.maxBudget ? (
                    <Badge variant="secondary">${profileData.preferences.maxBudget}</Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not set</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Privacy & Data Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Profile Data Export</h4>
              <p className="text-sm text-muted-foreground">Download a copy of all your profile data</p>
            </div>
            <Button variant="outline" onClick={exportProfile}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Analysis Photos</h4>
              <p className="text-sm text-muted-foreground">Your photos are stored securely and only used for analysis</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowPhotos(!showPhotos)}
            >
              {showPhotos ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPhotos ? 'Hide' : 'View'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}