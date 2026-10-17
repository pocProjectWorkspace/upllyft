'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth, APP_URLS } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';

/** Auth guard + content container. The Clinic portal is the parent's view; other roles get a pointer. */
export function PortalShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      window.location.replace(`${APP_URLS.main}/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading || !isAuthenticated || !user) return <PageSkeleton />;

  if (user.role !== 'USER') {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">The Clinic portal is for parents</h1>
        <p className="mt-2 text-sm text-gray-500">Families see their sessions, reports and forms here. Clinic staff work from Cases.</p>
        <Link href="/cases" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Go to Cases
        </Link>
      </main>
    );
  }

  return <main className="max-w-[1240px] mx-auto px-4 sm:px-7 py-8">{children}</main>;
}
