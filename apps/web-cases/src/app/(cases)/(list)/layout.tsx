'use client';

import { CasesSidebar } from '@/components/cases-sidebar';
import type { ReactNode } from 'react';

export default function CasesListLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <CasesSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
