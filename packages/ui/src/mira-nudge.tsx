'use client';

import { useState } from 'react';

export interface MiraNudgeProps {
  /** Contextual prompt text */
  message: string;
  /** Text to send to Mira when clicking "Ask Mira" */
  chipText: string;
  /** For cross-app usage: base URL of web-main (e.g. http://localhost:3000) */
  mainAppUrl?: string;
  /** For in-app (web-main): direct handler to open Mira */
  onAskMira?: () => void;
  /** Unique ID for dismiss tracking */
  nudgeId: string;
  /** Child name for personalization */
  childName?: string;
}

export function MiraNudge({
  message,
  chipText,
  mainAppUrl,
  onAskMira,
  nudgeId,
  childName,
}: MiraNudgeProps) {
  const storageKey = `mira_nudge_dismissed_${nudgeId}`;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === 'true';
  });

  if (dismissed) return null;

  const displayMessage = childName
    ? message.replace(/\[child name\]/gi, childName)
    : message.replace(/\s*\[child name\]'?s?\s*/gi, ' your child\'s ');

  function handleDismiss() {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  }

  function handleAskMira() {
    if (onAskMira) {
      onAskMira();
    } else if (mainAppUrl) {
      window.location.href =
        mainAppUrl + '?openMira=true&message=' + encodeURIComponent(chipText);
    }
  }

  return (
    <div className="relative rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-5 text-white overflow-hidden">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 sm:gap-4 pr-6">
        {/* Mini Mira avatar */}
        <img src="/Mira.png" alt="Mira" className="flex-shrink-0 w-10 h-10 rounded-full object-cover shadow-lg" />

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base text-white/95 leading-relaxed mb-3">
            {displayMessage}
          </p>
          <button
            onClick={handleAskMira}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Ask Mira
          </button>
        </div>
      </div>
    </div>
  );
}
