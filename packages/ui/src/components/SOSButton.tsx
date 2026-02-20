'use client';

import { useState, useEffect } from 'react';

export interface SOSButtonProps {
  /** Optional click handler — if not provided, defaults to opening the crisis dialog */
  onActivate?: () => void;
  /** Compact inline variant (for header) vs floating fixed variant */
  compact?: boolean;
  className?: string;
}

export function SOSButton({ onActivate, compact = false, className }: SOSButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-pulse every 30 seconds to draw attention
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 3000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Hide floating button when scrolling down, show on scroll up
  useEffect(() => {
    if (compact) return;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [compact]);

  if (compact) {
    return (
      <button
        onClick={onActivate}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors ${className || ''}`}
        aria-label="Crisis Support"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <span className="hidden lg:inline">SOS</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={onActivate}
        onMouseEnter={() => setIsPulsing(true)}
        onMouseLeave={() => setIsPulsing(false)}
        className={`fixed bottom-6 right-6 z-50 w-[60px] h-[60px] bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
        } ${isPulsing ? 'animate-pulse' : ''} ${className || ''}`}
        aria-label="Emergency SOS - Get immediate help"
      >
        <div className="relative">
          <svg className="w-7 h-7 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {isPulsing && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
          )}
        </div>
      </button>

      {/* Quick Emergency Numbers Tooltip */}
      <div
        className={`fixed bottom-24 right-6 z-40 bg-white rounded-xl shadow-xl border border-gray-100 p-3 transition-all duration-200 pointer-events-none ${
          isPulsing && isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <p className="text-xs font-semibold text-gray-700 mb-1">Get immediate support</p>
        <p className="text-xs text-gray-500">Emergency: 911</p>
        <p className="text-xs text-gray-500">Crisis Line: 988</p>
      </div>
    </>
  );
}
