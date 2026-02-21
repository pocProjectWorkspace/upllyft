'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { Avatar } from '@upllyft/ui';
import { useState, useEffect, useRef } from 'react';
import { LogOut, User, Settings, Bell } from 'lucide-react';

export function AdminHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (!user) return null;

  const displayName = user.name || user.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    await logout();
    window.location.href = `${APP_URLS.main}/login`;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left: Page context */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-500">
          Welcome back, <span className="font-medium text-gray-900">{displayName}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications placeholder */}
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors relative">
          <Bell className="w-5 h-5" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Avatar name={displayName} src={user.avatar || undefined} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-tight">{displayName}</p>
              <p className="text-xs text-gray-400 leading-tight capitalize">{user.role.toLowerCase()}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="py-1">
                <a
                  href={`${APP_URLS.main}/profile`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 transition-colors"
                >
                  <User className="w-4 h-4 text-teal-600" />
                  Profile
                </a>
                <a
                  href={`${APP_URLS.main}/settings`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-teal-600" />
                  Settings
                </a>
              </div>
              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
