'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Textarea } from '@upllyft/ui';
import { useFollowUp, useFollowUps } from '@/hooks/use-assessments';
import { formatDate } from '@/lib/utils';

interface FollowUpInputProps {
  conversationId: string;
}

export function FollowUpInput({ conversationId }: FollowUpInputProps) {
  const [query, setQuery] = useState('');
  const followUpMutation = useFollowUp();
  const { data: followUps } = useFollowUps(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new Q&A arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [followUps]);

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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Past Follow-up Q&As */}
      {followUps && followUps.length > 0 && (
        <div ref={scrollRef} className="max-h-96 overflow-y-auto p-6 space-y-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Follow-up Questions</h3>
          {followUps.map((qa) => (
            <div key={qa.id} className="space-y-3">
              {/* User question */}
              <div className="flex justify-end">
                <div className="max-w-[80%]">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-900">{qa.question}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">{formatDate(qa.createdAt)}</p>
                </div>
              </div>
              {/* AI answer */}
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="bg-teal-50 rounded-2xl px-4 py-3 border-l-4 border-teal-400">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{qa.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-6">
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!query.trim() || followUpMutation.isPending}
            className="shrink-0 self-end p-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {followUpMutation.isPending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
