'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * @deprecated Use the (cases)/layout.tsx route group layout instead.
 * This shell is no longer imported but kept for reference.
 */
export function CasesShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace(`${APP_URLS.main}/login`);
    return null;
  }

  if (user.role !== 'THERAPIST' && user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
    router.replace(APP_URLS.booking);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="cases" />
      <main>{children}</main>
    </div>
  );
}
