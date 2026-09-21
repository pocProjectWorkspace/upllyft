'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth, APP_URLS } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';

/**
 * Page-level wrapper. The header/SOS/crisis dialog now live in the root
 * layout's AppFrame; this only guards authentication and provides the
 * content container, showing a skeleton (not a blank screen) while the
 * session resolves.
 */
export function CommunityShell({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.replace(`${APP_URLS.main}/login`);
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return <PageSkeleton />;
  }

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">{children}</div>;
}
