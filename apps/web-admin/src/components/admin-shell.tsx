'use client';

import type { ReactNode } from 'react';
import { RoleGuard } from './role-guard';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RoleGuard>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
