'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';
import { useEffect, type ReactNode } from 'react';

const ALLOWED_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'THERAPIST']);

export function RoleGuard({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const allowed = !!user && ALLOWED_ROLES.has(user.role as string);

  // Redirects run in an effect (not during render) so they fire exactly once.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      window.location.replace(`${APP_URLS.main}/login`);
    } else if (!allowed) {
      window.location.replace(APP_URLS.main);
    }
  }, [isLoading, isAuthenticated, user, allowed]);

  if (isLoading || !isAuthenticated || !user || !allowed) {
    return <PageSkeleton className="px-0" />;
  }

  return <>{children}</>;
}
