'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@upllyft/api-client';
import { useState, type ReactNode } from 'react';
import { MiraProvider } from '@/components/mira/mira-context';
import { MiraPanel } from '@/components/mira/mira-panel';
import { MiraFab } from '@/components/mira/mira-fab';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider baseURL="/api">
        <MiraProvider>
          {children}
          <MiraFab />
          <MiraPanel />
        </MiraProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
