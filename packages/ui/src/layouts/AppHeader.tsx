'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth, getNavItems, APP_URLS, type AppName } from '@upllyft/api-client';
import { Avatar } from '../components/Avatar';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface AppHeaderProps {
  /** Which app is currently active — used to highlight the correct global nav item */
  currentApp?: AppName;
  /** Optional extra nav items shown after the global nav (for app-specific links) */
  localNavItems?: NavItem[];
  /** Override the logo element */
  logo?: React.ReactNode;
}

export function AppHeader({ currentApp, localNavItems, logo }: AppHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  if (!isAuthenticated || !user) return null;

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const globalNav = getNavItems(user.role);

  const handleLogout = async () => {
    await logout();
    window.location.href = `${APP_URLS.main}/login`;
  };

  const profileUrl = `${APP_URLS.main}/profile`;
  const bookmarksUrl = `${APP_URLS.main}/bookmarks`;
  const invitationsUrl = `${APP_URLS.main}/invitations`;
  const settingsUrl = `${APP_URLS.main}/settings`;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            {logo || (
              <a href={APP_URLS.main} className="flex items-center gap-2">
                <img src="/logo.png" alt="Upllyft" className="h-8 w-auto" />
              </a>
            )}

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {globalNav.map((item) => {
                const isActive = item.app === currentApp;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
              {localNavItems && localNavItems.length > 0 && (
                <>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  {localNavItems.map((item) => (
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
                </>
              )}
            </nav>
          </div>

          {/* Right: Notifications + User + Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
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

            {/* User Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Avatar name={displayName} src={user.image || undefined} size="sm" />
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {displayName}
                </span>
                <svg className="hidden sm:block w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <a
                      href={profileUrl}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>
                    <a
                      href={bookmarksUrl}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Bookmarks
                    </a>
                    <a
                      href={invitationsUrl}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Invitations
                    </a>
                    <a
                      href={settingsUrl}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </a>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>



          </div>
        </div>
      </div>



    </header>
  );
}
