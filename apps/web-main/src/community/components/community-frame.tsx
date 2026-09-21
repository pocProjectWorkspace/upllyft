'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@upllyft/api-client';
import { SOSButton } from '@upllyft/ui';
import { CrisisFlowDialog } from './crisis-flow-dialog';

/**
 * Community-section chrome: floating SOS button + crisis flow dialog.
 * Mounted once by `app/community/layout.tsx`, so it persists across
 * navigations within the community section.
 */
export function CommunityFrame({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      {isAuthenticated && <SOSButton onActivate={() => setShowCrisisDialog(true)} />}
      <CrisisFlowDialog open={showCrisisDialog} onClose={() => setShowCrisisDialog(false)} />
    </div>
  );
}
