'use client';

import { useState } from 'react';
import { useAuth } from '@upllyft/api-client';
import { LogOut } from 'lucide-react';

/**
 * Sign-out control for the routes that hide the shared AppHeader (org workspace,
 * admin console, onboarding, the /org resolver). Without it those screens are a
 * dead end: the header's user menu is the only other place to sign out.
 *
 * A full navigation (not router.push) so every cached query and the auth snapshot
 * are dropped with the page.
 */
export function SignOutButton({
  variant = 'sidebar',
  className = '',
}: {
  variant?: 'sidebar' | 'compact' | 'link';
  className?: string;
}) {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    setPending(true);
    try {
      await logout();
    } finally {
      window.location.href = '/login';
    }
  };

  const styles = {
    sidebar:
      'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors',
    compact:
      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-500 transition-colors',
    link: 'inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors',
  }[variant];

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={`${styles} disabled:opacity-60 ${className}`}
    >
      <LogOut className={variant === 'sidebar' ? 'w-5 h-5 flex-shrink-0' : 'w-4 h-4'} />
      <span>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
