'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '@upllyft/ui';
import { AdminSidebar } from './admin-sidebar';

/**
 * Persistent clinic-admin frame mounted once in the root layout: header and
 * sidebar survive route changes instead of remounting with every page.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader currentApp="admin" />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 p-6 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
