'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Camera, AlertCircle, CheckCircle } from 'lucide-react';

interface PhotoUploadProps {
  analysisType: 'body' | 'portrait';
  onUploadComplete: (imageUrl: string) => void;
  onUploadError: (error: string) => void;
  isUploading?: boolean;
  className?: string;
}

interface UploadResponse {
  uploadUrl: string;
  imageKey: string;
  expiresIn: number;
}

export function PhotoUpload({ 
  analysisType, 
  onUploadComplete, 
  onUploadError, 
  isUploading = false,
  className = '' 
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image.';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      onUploadError(error);
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [onUploadError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const uploadFile = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(10);

      // Get signed upload URL
      const response = await fetch('/api/analysis/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          analysisType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get upload URL');
      }

      const uploadData: UploadResponse = await response.json();
      setUploadProgress(30);

      // Upload file to S3
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      setUploadProgress(100);

      // Extract the image URL from the upload URL (remove query parameters)
      const imageUrl = uploadData.uploadUrl.split('?')[0];
      onUploadComplete(imageUrl);

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(0);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getPhotoGuidelines = () => {
    if (analysisType === 'body') {
      return {
        title: 'Full Body Photo Guidelines',
        tips: [
          'Stand straight with arms at your sides',
          'Wear form-fitting clothes or undergarments',
          'Ensure good lighting and clear visibility',
          'Take photo from about 6 feet away',
          'Keep the camera at chest height'
        ]
      };
    } else {
      return {
        title: 'Portrait Photo Guidelines',
        tips: [
          'Face the camera directly with good lighting',
          'Remove sunglasses and hats',
          'Use natural lighting when possible',
          'Ensure your face is clearly visible',
          'Avoid heavy makeup that changes your natural coloring'
        ]
      };
    }
  };

  const guidelines = getPhotoGuidelines();

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {analysisType === 'body' ? 'Upload Full Body Photo' : 'Upload Portrait Photo'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Guidelines */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div>
                <p className="font-medium mb-2">{guidelines.title}</p>
                <ul className="text-sm space-y-1">
                  {guidelines.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Upload Area */}
          {!selectedFile ? (
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${isUploading ? 'pointer-events-none opacity-50' : 'hover:border-primary hover:bg-primary/5'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Drop your photo here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports JPEG, PNG, WebP up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                <img
                  src={previewUrl || ''}
                  alt="Preview"
                  className="w-full max-w-md mx-auto rounded-lg border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={clearSelection}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* File Info */}
              <div className="text-sm text-muted-foreground text-center">
                <p>{selectedFile.name}</p>
                <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Upload Success */}
              {uploadProgress === 100 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Photo uploaded successfully! Analysis will begin shortly.
                  </AlertDescription>
                </Alert>
              )}

              {/* Upload Button */}
              {uploadProgress === 0 && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={uploadFile} disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                  <Button variant="outline" onClick={clearSelection} disabled={isUploading}>
                    Choose Different Photo
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}