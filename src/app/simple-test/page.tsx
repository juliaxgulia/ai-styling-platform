'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SimpleTestPage() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{role: string, content: string}>>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/chat/simple-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          sessionId: sessionId || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConversation(prev => [
          ...prev,
          { role: 'user', content: message },
          { role: 'assistant', content: data.response }
        ]);
        setSessionId(data.sessionId);
        setMessage('');
      } else {
        setError(data.error?.message || 'Failed to send message');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Simple Onboarding Test</CardTitle>
          <p className="text-sm text-gray-600">
            Testing simplified onboarding without complex schema extraction
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Conversation Display */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {conversation.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-100 ml-8' 
                    : 'bg-gray-100 mr-8'
                }`}
              >
                <div className="font-semibold text-xs text-gray-500 mb-1">
                  {msg.role === 'user' ? 'You' : 'AI Stylist'}
                </div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={sendMessage}
              disabled={!message.trim() || loading}
            >
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="text-xs text-gray-500">
              Session ID: {sessionId}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}