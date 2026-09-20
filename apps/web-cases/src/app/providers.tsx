'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, NavigationProvider, type LinkComponent } from '@upllyft/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';

// Call the API origin directly (skipping the Next.js `/api` rewrite proxy hop)
// when NEXT_PUBLIC_API_DIRECT=1 and NEXT_PUBLIC_API_URL are set at build time.
const API_BASE =
  process.env.NEXT_PUBLIC_API_DIRECT === '1' && process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : '/api';

export function Providers({ children }: { children: ReactNode }) {
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
        <AuthProvider baseURL={API_BASE}>{children}</AuthProvider>
      </NavigationProvider>
    </QueryClientProvider>
  );
}
