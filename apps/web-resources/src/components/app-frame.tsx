'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '@upllyft/ui';

/**
 * Persistent frame mounted once in the root layout so the header survives
 * route changes instead of remounting with every page.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="resources" />
      {children}
    </div>
  );
}
