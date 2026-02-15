'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCrisisDetection } from '@/hooks/use-crisis';
import { CrisisFlowDialog } from './crisis-flow-dialog';

interface CrisisKeywordsDetectorProps {
  /** CSS selector for input/textarea elements to monitor */
  selector?: string;
  /** Directly provide a value to monitor instead of using DOM selectors */
  value?: string;
  /** Debounce interval in ms (default 1000) */
  debounceMs?: number;
}

/**
 * Monitors input fields for crisis keywords and triggers intervention.
 *
 * Usage:
 * 1. With selector: <CrisisKeywordsDetector selector="textarea, input[type='text']" />
 * 2. With value:    <CrisisKeywordsDetector value={postContent} />
 *
 * Place this component anywhere in a page where user-generated text input occurs.
 */
export function CrisisKeywordsDetector({
  selector,
  value,
  debounceMs = 1000,
}: CrisisKeywordsDetectorProps) {
  const { detectCrisisKeywords, showCrisisDialog, setShowCrisisDialog } = useCrisisDetection();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedDetect = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        detectCrisisKeywords(text);
      }, debounceMs);
    },
    [detectCrisisKeywords, debounceMs],
  );

  // Monitor direct value prop
  useEffect(() => {
    if (value !== undefined && value.length >= 10) {
      debouncedDetect(value);
    }
  }, [value, debouncedDetect]);

  // Monitor DOM input elements via selector
  useEffect(() => {
    if (!selector) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target.value && target.value.length >= 10) {
        debouncedDetect(target.value);
      }
    };

    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => el.addEventListener('input', handleInput));

    // Also observe for dynamically added elements
    const observer = new MutationObserver(() => {
      const newElements = document.querySelectorAll(selector);
      newElements.forEach((el) => {
        el.removeEventListener('input', handleInput);
        el.addEventListener('input', handleInput);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      elements.forEach((el) => el.removeEventListener('input', handleInput));
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selector, debouncedDetect]);

  return (
    <CrisisFlowDialog
      open={showCrisisDialog}
      onClose={() => setShowCrisisDialog(false)}
    />
  );
}
