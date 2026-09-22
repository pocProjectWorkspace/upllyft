'use client';

import type { ReactNode } from 'react';
import { AdminSidebar } from '@/clinic/components/admin-sidebar';

/**
 * Clinic admin section of the hub (merged from the former web-admin app).
 * The shared header comes from the root AppFrame (currentApp="admin" under
 * /clinic); this layout provides the persistent sidebar and content area.
 * Pages keep using AdminShell for their role guard.
 */
export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 p-6 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
