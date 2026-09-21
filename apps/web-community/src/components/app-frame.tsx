'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@upllyft/api-client';
import { AppHeader, SOSButton } from '@upllyft/ui';
import { CrisisFlowDialog } from './crisis-flow-dialog';

/**
 * Persistent frame mounted once in the root layout: header, floating SOS
 * button and crisis dialog survive route changes instead of remounting with
 * every page (which used to restart the notification poll on each click).
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentApp="community" onSOSClick={() => setShowCrisisDialog(true)} />
      {children}
      {isAuthenticated && <SOSButton onActivate={() => setShowCrisisDialog(true)} />}
      <CrisisFlowDialog open={showCrisisDialog} onClose={() => setShowCrisisDialog(false)} />
    </div>
  );
}
