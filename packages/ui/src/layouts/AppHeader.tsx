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
  const [mobileOpen, setMobileOpen] = useState(false);
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
  const settingsUrl = `${APP_URLS.main}/settings`;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            {logo || (
              <a href={APP_URLS.main} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">U</span>
                </div>
                <span className="text-lg font-bold text-gray-900">Upllyft</span>
              </a>
            )}

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <a
                    href={profileUrl}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profile
                  </a>
                  <a
                    href={settingsUrl}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </a>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {globalNav.map((item) => {
              const isActive = item.app === currentApp;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
                <div className="h-px bg-gray-100 my-2" />
                {localNavItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
      )}
    </header>
  );
}
