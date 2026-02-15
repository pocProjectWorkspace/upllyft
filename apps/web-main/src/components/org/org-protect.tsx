'use client';

import { useAuth } from '@upllyft/api-client';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

interface OrgProtectProps {
  children: ReactNode;
}

export function OrgProtect({ children }: OrgProtectProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
}
