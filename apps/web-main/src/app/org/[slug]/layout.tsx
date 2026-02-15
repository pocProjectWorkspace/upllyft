'use client';

import { useAuth } from '@upllyft/api-client';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getOrganization, type OrgDetails } from '@/lib/api/organizations';
import { OrgProtect } from '@/components/org/org-protect';

const navItems = (slug: string) => [
  {
    label: 'Dashboard',
    href: `/org/${slug}`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    exact: true,
  },
  {
    label: 'Members',
    href: `/org/${slug}/members`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: 'Communities',
    href: `/org/${slug}/communities`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    label: 'Events',
    href: `/org/${slug}/events`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: `/org/${slug}/settings`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function OrgLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;
  const pathname = usePathname();
  const [org, setOrg] = useState<OrgDetails | null>(null);

  useEffect(() => {
    if (slug) {
      getOrganization(slug)
        .then(setOrg)
        .catch(() => setOrg(null));
    }
  }, [slug]);

  const items = navItems(slug);

  return (
    <OrgProtect>
      <div className="min-h-screen flex bg-gray-50/50">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col fixed inset-y-0 left-0 z-40">
          <div className="p-4 border-b border-gray-100">
            <a href={`/org/${slug}`} className="flex items-center gap-3">
              {org?.logo ? (
                <img
                  src={org.logo}
                  alt={org.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                  <span className="text-teal-700 font-bold text-sm">
                    {org?.name?.charAt(0) || 'O'}
                  </span>
                </div>
              )}
              <span className="font-semibold text-gray-900 truncate">
                {org?.name || 'Organization'}
              </span>
            </a>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
            {items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <a
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              <span>Back to App</span>
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 md:ml-64">
          {/* Mobile header */}
          <div className="md:hidden flex items-center gap-3 p-4 bg-white border-b border-gray-100">
            <a href={`/org/${slug}`} className="flex items-center gap-2">
              {org?.logo ? (
                <img src={org.logo} alt={org.name} className="w-6 h-6 rounded object-cover" />
              ) : (
                <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center">
                  <span className="text-teal-700 font-bold text-xs">{org?.name?.charAt(0) || 'O'}</span>
                </div>
              )}
              <span className="font-semibold text-gray-900 text-sm truncate">{org?.name || 'Organization'}</span>
            </a>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </OrgProtect>
  );
}
