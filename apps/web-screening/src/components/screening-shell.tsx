'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function ScreeningShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const localNavItems = [
    { label: 'My Screenings', href: '/', active: pathname === '/' },
    { label: 'Insights', href: '/insights', active: pathname.startsWith('/insights') },
    ...(user.role === 'THERAPIST'
      ? [{ label: 'Shared With Me', href: '/shared', active: pathname === '/shared' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="screening" localNavItems={localNavItems} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
