'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { NurseryProvider, useNursery } from '@/components/nursery/nursery-context';
import { Baby, Users, Settings, School } from 'lucide-react';

/**
 * The nursery shell.
 *
 * DELIBERATELY NOT THE CASES SHELL. web-cases is organised around the Case, and a
 * nursery can never have one — the capability map forbids it. Rendering keyworkers
 * inside the cases chrome would mean hiding the app's own spine from them with role
 * checks, which is the antipattern the tenancy design rejects.
 *
 * And note what this guard is NOT doing: it does not decide access. `GET /facilities`
 * already returns only what the caller staffs, and every write re-checks membership
 * server-side. Hiding a nav item is a courtesy, never a control — the real gate is
 * the capability map in the API, which is where it has to live regardless of what
 * this component renders.
 */
function NurseryChrome({ children }: { children: ReactNode }) {
  const { facilities, facilityId, setFacilityId, isLoading } = useNursery();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Staffs no nursery. Not an error and not a redirect loop — just nothing here yet.
  if (facilities.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <School className="w-7 h-7 text-teal-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            You’re not part of a nursery yet
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Ask whoever runs your setting to add you, or set one up yourself.
          </p>
          <button
            onClick={() => router.push('/nursery/setup')}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            Set up a nursery
          </button>
        </div>
      </div>
    );
  }

  const nav = [
    { href: '/nursery', label: 'Roster', icon: Baby },
    { href: '/nursery/staff', label: 'Staff', icon: Users },
    { href: '/nursery/setup', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <School className="w-4 h-4 text-white" />
              </div>
              {facilities.length > 1 ? (
                <select
                  value={facilityId ?? ''}
                  onChange={e => setFacilityId(e.target.value)}
                  className="text-sm font-semibold text-gray-900 bg-transparent border-0 focus:ring-0 cursor-pointer"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold text-gray-900">
                  {facilities[0]?.name}
                </span>
              )}
            </div>

            <nav className="flex items-center gap-1">
              {nav.map(item => {
                const active =
                  item.href === '/nursery'
                    ? pathname === '/nursery'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export default function NurseryLayout({ children }: { children: ReactNode }) {
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
    router.replace(`${APP_URLS.main}/login`);
    return null;
  }

  return (
    <NurseryProvider>
      <NurseryChrome>{children}</NurseryChrome>
    </NurseryProvider>
  );
}
