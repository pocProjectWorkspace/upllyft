'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { ListSkeleton } from '@/components/skeletons';
/**
 * @deprecated Use the (cases)/layout.tsx route group layout instead.
 * This shell is no longer imported but kept for reference.
 */
export function CasesShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <ListSkeleton />
    );
  }

  if (!isAuthenticated || !user) {
    router.replace(`${APP_URLS.main}/login`);
    return null;
  }

  if (user.role !== 'THERAPIST' && user.role !== 'EDUCATOR' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    router.replace(APP_URLS.booking);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header is rendered once by the hub's root AppFrame. */}
      <main>{children}</main>
    </div>
  );
}
