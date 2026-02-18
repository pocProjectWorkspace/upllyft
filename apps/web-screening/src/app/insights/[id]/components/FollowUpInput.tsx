'use client';

import { useState } from 'react';
import { Button, Textarea } from '@upllyft/ui';
import { useFollowUp } from '@/hooks/use-assessments';

interface FollowUpInputProps {
  conversationId: string;
}

export function FollowUpInput({ conversationId }: FollowUpInputProps) {
  const [query, setQuery] = useState('');
  const followUpMutation = useFollowUp();

  function handleSubmit() {
    if (!query.trim()) return;
    followUpMutation.mutate(
      { conversationId, query },
      { onSuccess: () => setQuery('') },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Ask a Follow-up Question</h3>
      <div className="flex gap-3">
        <Textarea
          placeholder="Ask a follow-up question about this analysis..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={!query.trim() || followUpMutation.isPending}
          className="shrink-0 self-end"
        >
          {followUpMutation.isPending ? (
            'Sending...'
          ) : (
            <span className="inline-flex items-center gap-2">
              Send
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
