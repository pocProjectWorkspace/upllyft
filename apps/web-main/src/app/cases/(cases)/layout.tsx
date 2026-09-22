'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';
import { useEffect, type ReactNode } from 'react';

const PROFESSIONAL_ROLES = new Set(['THERAPIST', 'EDUCATOR', 'ADMIN', 'SUPERADMIN']);

export default function CasesAppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const allowed = !!user && PROFESSIONAL_ROLES.has(user.role as string);

  // Redirects run in an effect (not during render) so they fire exactly once.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      window.location.replace(`${APP_URLS.main}/login`);
    } else if (!allowed) {
      // Professional-only app
      window.location.replace(APP_URLS.booking);
    }
  }, [isLoading, isAuthenticated, user, allowed]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header is rendered once by the hub's root AppFrame (currentApp="cases" under /cases). */}
      {isLoading || !allowed ? <PageSkeleton /> : children}
    </div>
  );
}
