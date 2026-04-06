'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

/**
 * Hook that redirects to /login if not authenticated.
 * Uses useEffect to prevent render-time router calls that cause infinite loops.
 * Returns { user, isLoading, isAuthenticated, isReady } — render a loading spinner while !isReady.
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login');
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  const isReady = !auth.isLoading && auth.isAuthenticated && !!auth.user;

  return { ...auth, isReady };
}

/**
 * Hook that redirects authenticated users away (e.g., from login/register pages).
 * Uses useEffect to prevent render-time router calls that cause infinite loops.
 */
export function useRedirectIfAuthenticated(redirectTo = '/') {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [auth.isLoading, auth.isAuthenticated, router, redirectTo]);

  return auth;
}
