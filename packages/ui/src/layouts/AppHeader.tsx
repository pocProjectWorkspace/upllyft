'use client';

import { useState, type ReactNode } from 'react';
import { Avatar } from '../components/Avatar';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface AppHeaderProps {
  userName?: string;
  userAvatar?: string;
  navItems?: NavItem[];
  onLogout?: () => void;
  logo?: ReactNode;
}

const defaultNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Community', href: '/community' },
  { label: 'Screening', href: '/screening' },
  { label: 'Booking', href: '/booking' },
  { label: 'Resources', href: '/resources' },
  { label: 'Cases', href: '/cases' },
];

export function AppHeader({
  userName = 'User',
  userAvatar,
  navItems = defaultNavItems,
  onLogout,
  logo,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            {logo || (
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">U</span>
                </div>
                <span className="text-lg font-bold text-gray-900">Upllyft</span>
              </a>
            )}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Avatar name={userName} src={userAvatar} size="sm" />
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {userName}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profile
                  </a>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </a>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
