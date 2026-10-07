'use client';

import { AppHeader } from '@upllyft/ui';
import type { AppName } from '@upllyft/api-client';
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
  '/accept-invitation',
  '/onboarding',
  '/admin',
  '/org',
];

// Sections of other products that have been merged into this app. The header
// highlights them as their own product even though they share the origin.
const MERGED_SECTIONS: Array<[prefix: string, app: AppName]> = [
  ['/community', 'community'],
  ['/screening', 'screening'],
  ['/booking', 'booking'],
  ['/resources', 'resources'],
  ['/cases', 'cases'],
  ['/clinic', 'admin'],
];

/**
 * Persistent application frame mounted once in the root layout. The header
 * lives here (instead of inside every page) so soft navigations keep it
 * mounted: no header flash, no notification-poll restart per route.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const hideHeader = NO_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const currentApp: AppName =
    MERGED_SECTIONS.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? 'main';

  return (
    <>
      {!hideHeader && <AppHeader currentApp={currentApp} />}
      {children}
    </>
  );
}
