'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth, APP_URLS } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';

/**
 * Page-level wrapper. The header now lives in the root layout's AppFrame;
 * this only guards authentication and provides the content container,
 * showing a skeleton (not a blank screen) while the session resolves.
 */
export function ScreeningShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      window.location.replace(`${APP_URLS.main}/login`);
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading || !isAuthenticated || !user) {
    return <PageSkeleton />;
  }

  return <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>;
}
