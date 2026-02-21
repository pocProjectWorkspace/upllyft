'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import type { ReactNode } from 'react';

export function RoleGuard({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (typeof window !== 'undefined') {
      window.location.href = `${APP_URLS.main}/login`;
    }
    return null;
  }

  if (user.role !== 'ADMIN' && user.role !== 'THERAPIST') {
    if (typeof window !== 'undefined') {
      window.location.href = APP_URLS.main;
    }
    return null;
  }

  return <>{children}</>;
}
