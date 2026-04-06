'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

/**
 * Hook that redirects to /login if not authenticated.
 * Uses useEffect to prevent render-time router calls that cause infinite loops.
 * Returns { user, isLoading, isAuthenticated } — render a loading spinner while isLoading is true.
 */
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated, ...rest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  return { user, isLoading, isAuthenticated, isReady: !isLoading && isAuthenticated && !!user, ...rest };
}

/**
 * Hook that redirects authenticated users away (e.g., from login/register pages).
 * Uses useEffect to prevent render-time router calls that cause infinite loops.
 */
export function useRedirectIfAuthenticated(redirectTo = '/') {
  const { isLoading, isAuthenticated, ...rest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, router, redirectTo]);

  return { isLoading, isAuthenticated, ...rest };
}
