'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Settings, 
  Camera, 
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ErrorResponse, RecoveryAction } from '@/lib/errors';

interface ErrorDisplayProps {
  error: ErrorResponse['error'];
  onRetry?: () => void;
  onFallback?: () => void;
  onSessionRecovery?: () => void;
  onManualInput?: () => void;
  className?: string;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onFallback, 
  onSessionRecovery, 
  onManualInput,
  className = '' 
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const getErrorIcon = () => {
    switch (error.code) {
      case 'AI_SERVICE_ERROR':
      case 'CONVERSATION_ERROR':
        return <MessageSquare className="w-5 h-5" />;
      case 'PHOTO_ANALYSIS_ERROR':
        return <Camera className="w-5 h-5" />;
      case 'SESSION_EXPIRED':
        return <Clock className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getErrorColor = () => {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'SESSION_EXPIRED':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'AI_SERVICE_ERROR':
      case 'PHOTO_ANALYSIS_ERROR':
      case 'CONVERSATION_ERROR':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRecoveryAction = (action: RecoveryAction) => {
    switch (action.type) {
      case 'retry':
        handleRetry();
        break;
      case 'fallback':
        onFallback?.();
        break;
      case 'session_recovery':
        onSessionRecovery?.();
        break;
      case 'manual':
        onManualInput?.();
        break;
    }
  };

  return (
    <Card className={`${className} border-l-4 ${getErrorColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${getErrorColor()}`}>
            {getErrorIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {getErrorTitle(error.code)}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {error.message}
            </p>
            {error.retryable && error.retryAfter && (
              <div className="flex items-center gap-1 mt-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Retry available in {Math.ceil(error.retryAfter / 1000)}s
                </span>
              </div>
            )}
          </div>
          <Badge variant={error.retryable ? 'secondary' : 'destructive'} className="text-xs">
            {error.retryable ? 'Retryable' : 'Error'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Recovery Actions */}
        {error.recoveryActions && error.recoveryActions.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">What you can do:</h4>
            <div className="grid gap-2">
              {error.recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.type === 'retry' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRecoveryAction(action)}
                  disabled={isRetrying && action.type === 'retry'}
                  className="justify-start text-left h-auto p-3"
                >
                  <div className="flex items-center gap-2 w-full">
                    {getActionIcon(action.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {action.description}
                      </div>
                    </div>
                    {isRetrying && action.type === 'retry' && (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Error Details Toggle */}
        <div className="border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show Details
              </>
            )}
          </Button>

          {showDetails && (
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600">
              <div className="grid gap-1">
                <div><span className="font-semibold">Code:</span> {error.code}</div>
                <div><span className="font-semibold">Request ID:</span> {error.requestId}</div>
                <div><span className="font-semibold">Time:</span> {new Date(error.timestamp).toLocaleString()}</div>
                {error.details ? (
                  <div>
                    <span className="font-semibold">Details:</span>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    'AI_SERVICE_ERROR': 'AI Service Unavailable',
    'CONVERSATION_ERROR': 'Conversation Issue',
    'PHOTO_ANALYSIS_ERROR': 'Photo Analysis Failed',
    'SESSION_EXPIRED': 'Session Expired',
    'VALIDATION_ERROR': 'Input Validation Error',
    'AUTHENTICATION_ERROR': 'Authentication Required',
    'AUTHORIZATION_ERROR': 'Access Denied',
    'NOT_FOUND': 'Not Found',
    'DATABASE_ERROR': 'Data Storage Issue',
    'STORAGE_ERROR': 'File Storage Issue',
    'INTERNAL_SERVER_ERROR': 'Server Error'
  };

  return titles[code] || 'Unexpected Error';
}

function getActionIcon(type: RecoveryAction['type']) {
  switch (type) {
    case 'retry':
      return <RefreshCw className="w-4 h-4" />;
    case 'fallback':
      return <Settings className="w-4 h-4" />;
    case 'session_recovery':
      return <Clock className="w-4 h-4" />;
    case 'manual':
      return <Camera className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
}

// Simplified error display for inline use
export function InlineError({ 
  message, 
  onRetry, 
  className = '' 
}: { 
  message: string; 
  onRetry?: () => void; 
  className?: string; 
}) {
  return (
    <Alert className={`${className} border-red-200 bg-red-50`}>
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="flex items-center justify-between">
          <span>{message}</span>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} className="ml-2 h-6 px-2">
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}