'use client';

import { AppHeader } from '@upllyft/ui';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Routes that render their own chrome (auth screens, onboarding, and the
// admin console / org workspace which have their own sidebars).
const NO_HEADER_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/callback',
  '/onboarding',
  '/admin',
  '/org',
];

/**
 * Persistent application frame mounted once in the root layout. The header
 * lives here (instead of inside every page) so soft navigations keep it
 * mounted: no header flash, no notification-poll restart per route.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const hideHeader = NO_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <>
      {!hideHeader && <AppHeader currentApp="main" />}
      {children}
    </>
  );
}
