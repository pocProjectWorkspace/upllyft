'use client';

import { useEffect, type ReactNode } from 'react';
import { useCrisisDetection } from '@/hooks/use-crisis';
import { CrisisFlowDialog } from './crisis-flow-dialog';

interface CrisisDetectorWrapperProps {
  /** Text content to monitor for crisis keywords */
  content?: string;
  children: ReactNode;
}

/**
 * Wraps content and auto-detects crisis keywords in the provided text.
 * When high-confidence crisis keywords are found, shows the CrisisFlowDialog.
 */
export function CrisisDetectorWrapper({ content, children }: CrisisDetectorWrapperProps) {
  const { detectCrisisKeywords, showCrisisDialog, setShowCrisisDialog } = useCrisisDetection();

  useEffect(() => {
    if (content) {
      detectCrisisKeywords(content);
    }
  }, [content, detectCrisisKeywords]);

  return (
    <>
      {children}
      <CrisisFlowDialog
        open={showCrisisDialog}
        onClose={() => setShowCrisisDialog(false)}
      />
    </>
  );
}
