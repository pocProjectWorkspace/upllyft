'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export function CommunityShell({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace(`${APP_URLS.main}/login`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentApp="community" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        {children}
      </div>
    </div>
  );
}
