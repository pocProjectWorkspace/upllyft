'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function BookingShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace(`${APP_URLS.main}/login`);
    return null;
  }

  const isTherapist = user.role === 'THERAPIST';
  const isAdmin = user.role === 'ADMIN';

  const patientLocal = [
    { label: 'Find Therapists', href: '/', active: pathname === '/' },
    { label: 'My Bookings', href: '/bookings', active: pathname.startsWith('/bookings') },
  ];

  const therapistLocal = [
    { label: 'Dashboard', href: '/therapist/dashboard', active: pathname === '/therapist/dashboard' },
    { label: 'Bookings', href: '/therapist/bookings', active: pathname === '/therapist/bookings' },
    { label: 'Availability', href: '/therapist/availability', active: pathname === '/therapist/availability' },
    { label: 'Pricing', href: '/therapist/pricing', active: pathname === '/therapist/pricing' },
  ];

  const adminLocal = [
    { label: 'Find Therapists', href: '/', active: pathname === '/' },
    { label: 'Settings', href: '/admin/settings', active: pathname === '/admin/settings' },
    { label: 'Commissions', href: '/admin/commissions', active: pathname === '/admin/commissions' },
  ];

  const localNavItems = isAdmin ? adminLocal : isTherapist ? therapistLocal : patientLocal;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="booking" localNavItems={localNavItems} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
