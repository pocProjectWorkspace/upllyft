'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function ResourcesShell({ children }: { children: ReactNode }) {
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
    router.replace('http://localhost:3000/login');
    return null;
  }

  const isTherapist = user.role === 'THERAPIST';
  const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR';

  const parentLocal = [
    { label: 'My Library', href: '/', active: pathname === '/' },
    { label: 'Create', href: '/create', active: pathname.startsWith('/create') },
    { label: 'Community', href: '/community', active: pathname.startsWith('/community') },
    { label: 'My Homework', href: '/assignments', active: pathname === '/assignments' },
    { label: 'Progress', href: '/progress', active: pathname.startsWith('/progress') },
  ];

  const therapistLocal = [
    { label: 'My Library', href: '/', active: pathname === '/' },
    { label: 'Create', href: '/create', active: pathname.startsWith('/create') },
    { label: 'Community', href: '/community', active: pathname.startsWith('/community') },
    { label: 'Sent Assignments', href: '/assignments', active: pathname === '/assignments' },
    { label: 'Recommendations', href: '/recommendations', active: pathname.startsWith('/recommendations') },
  ];

  const adminLocal = [
    { label: 'My Library', href: '/', active: pathname === '/' },
    { label: 'Create', href: '/create', active: pathname.startsWith('/create') },
    { label: 'Community', href: '/community', active: pathname.startsWith('/community') },
    { label: 'Moderation', href: '/moderation', active: pathname.startsWith('/moderation') },
    { label: 'Contributors', href: '/contributors', active: pathname.startsWith('/contributors') },
  ];

  const localNavItems = isAdmin ? adminLocal : isTherapist ? therapistLocal : parentLocal;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="resources" localNavItems={localNavItems} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
