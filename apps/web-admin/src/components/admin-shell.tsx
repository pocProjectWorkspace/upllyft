'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '@upllyft/ui';
import { RoleGuard } from './role-guard';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RoleGuard>
      <div className="flex flex-col min-h-screen">
        <AppHeader currentApp="admin" />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <AdminHeader />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
