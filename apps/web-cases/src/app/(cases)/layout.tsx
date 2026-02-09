'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export default function CasesAppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

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

  // Professional-only app
  if (user.role !== 'THERAPIST' && user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
    router.replace('http://localhost:3004');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="cases" />
      {children}
    </div>
  );
}
