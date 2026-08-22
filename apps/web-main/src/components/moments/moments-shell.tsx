'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@upllyft/api-client';
import { AppHeader, Avatar, Skeleton } from '@upllyft/ui';
import { useMyProfile } from '@/hooks/use-dashboard';
import { calculateAge, type Child } from '@/lib/api/profiles';

const SELECTED_CHILD_KEY = 'upllyft_selected_child';

interface MomentsChildContextValue {
  child: Child | null;
  childList: Child[];
  selectChild: (id: string) => void;
  loading: boolean;
}

const MomentsChildContext = createContext<MomentsChildContextValue>({
  child: null,
  childList: [],
  selectChild: () => {},
  loading: true,
});

export function useMomentsChild() {
  return useContext(MomentsChildContext);
}

const TABS = [
  { label: 'Everyday Moments', href: '/moments' },
  { label: 'Mira has noticed', href: '/moments/insights' },
  { label: 'Progress', href: '/moments/progress' },
];

/**
 * The shared frame for every Moments screen: parent-only guard, the child identity hero
 * (the child — not the account — anchors the context, so the switcher lives here), and
 * the three-destination tab nav.
 */
export function MomentsShell({ children }: { children: React.ReactNode }) {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { data: profile, isLoading } = useMyProfile();

  const [selectedChildId, setSelectedChildId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(SELECTED_CHILD_KEY) : null,
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Moments is a parent surface — everyone else goes back to their own home.
  useEffect(() => {
    if (isReady && isAuthenticated && user && user.role !== 'USER') {
      router.replace('/');
    }
  }, [isReady, isAuthenticated, user, router]);

  const childList = profile?.children ?? [];
  const child = selectedChildId
    ? childList.find((c) => c.id === selectedChildId) || childList[0] || null
    : childList[0] || null;

  useEffect(() => {
    if (child) localStorage.setItem(SELECTED_CHILD_KEY, child.id);
  }, [child]);

  if (!isReady || (user && user.role !== 'USER')) return null;

  function selectChild(id: string) {
    setSelectedChildId(id);
    setSwitcherOpen(false);
  }

  return (
    <MomentsChildContext.Provider value={{ child, childList, selectChild, loading: isLoading }}>
      <div className="min-h-screen bg-gray-50">
        <AppHeader currentApp="main" />

        {/* ── Child identity hero ─────────────────────────────── */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="max-w-5xl mx-auto px-4 pt-6 pb-0">
            {isLoading ? (
              <Skeleton className="h-14 w-64 bg-white/20" />
            ) : child ? (
              <div className="relative inline-block">
                <button
                  onClick={() => setSwitcherOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-xl px-2 py-1 -mx-2 hover:bg-white/10 transition-colors"
                >
                  <Avatar name={child.firstName} size="md" />
                  <span className="text-left">
                    <span className="block text-lg font-bold leading-tight">
                      {child.firstName}
                      <svg className="inline-block w-4 h-4 ml-1.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <span className="block text-xs text-teal-100">
                      {calculateAge(child.dateOfBirth)} yrs
                      {child.primaryLanguage ? ` · ${child.primaryLanguage} at home` : ''}
                    </span>
                  </span>
                </button>

                {switcherOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-30">
                    <p className="px-4 pt-1 pb-2 text-[11px] font-semibold tracking-wide text-gray-400">
                      YOUR CHILDREN
                    </p>
                    {childList.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectChild(c.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-teal-50 transition-colors ${
                          c.id === child.id ? 'bg-teal-50/60' : ''
                        }`}
                      >
                        <Avatar name={c.firstName} size="sm" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-gray-900">{c.firstName}</span>
                          <span className="block text-xs text-gray-500">{calculateAge(c.dateOfBirth)} yrs</span>
                        </span>
                        {c.id === child.id && <span className="text-teal-600 text-sm">✓</span>}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link
                        href="/profile/children"
                        className="block px-4 py-2.5 text-sm text-teal-700 font-medium hover:bg-teal-50"
                      >
                        + Add a child
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-1">
                <p className="text-lg font-bold">Everyday Moments</p>
                <p className="text-sm text-teal-100">
                  Add your child to start capturing moments.{' '}
                  <Link href="/profile/children" className="underline font-medium">Add a child</Link>
                </p>
              </div>
            )}

            {/* ── Tabs ────────────────────────────────────────── */}
            <nav className="flex gap-1 mt-4 -mb-px">
              {TABS.map((tab) => {
                const active =
                  tab.href === '/moments' ? pathname === '/moments' : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-gray-50 text-teal-900'
                        : 'text-teal-50/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </div>
    </MomentsChildContext.Provider>
  );
}
