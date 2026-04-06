'use client';

import { useRequireAuth } from '@upllyft/api-client';
import { type ReactNode } from 'react';

interface OrgProtectProps {
  children: ReactNode;
}

export function OrgProtect({ children }: OrgProtectProps) {
  const { user, isReady } = useRequireAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
