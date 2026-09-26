'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, NavigationProvider, type LinkComponent } from '@upllyft/api-client';
import type { User } from '@upllyft/types';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import { MiraProvider } from '@/components/mira/mira-context';

// Mira's FAB and panel pull in framer-motion; load them after the page is
// interactive instead of shipping them in every route's first-load bundle.
const MiraFab = dynamic(() => import('@/components/mira/mira-fab').then((m) => m.MiraFab), { ssr: false });
const MiraPanel = dynamic(() => import('@/components/mira/mira-panel').then((m) => m.MiraPanel), { ssr: false });

// Call the API origin directly (skipping the Next.js `/api` rewrite proxy hop)
// when NEXT_PUBLIC_API_DIRECT=1 and NEXT_PUBLIC_API_URL are set at build time.
const API_BASE =
  process.env.NEXT_PUBLIC_API_DIRECT === '1' && process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : '/api';

export function Providers({
  children,
  serverUser = null,
}: {
  children: ReactNode;
  serverUser?: Promise<User | null> | null;
}) {
  const router = useRouter();
  const navigate = useCallback((href: string) => router.push(href), [router]);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProvider linkComponent={Link as unknown as LinkComponent} navigate={navigate}>
        <AuthProvider baseURL={API_BASE} serverUser={serverUser}>
          <MiraProvider>
            {children}
            <MiraFab />
            <MiraPanel />
          </MiraProvider>
        </AuthProvider>
      </NavigationProvider>
    </QueryClientProvider>
  );
}
