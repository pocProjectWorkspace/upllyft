'use client';

import { useState, type ReactNode } from 'react';

export interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  active?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

export function Sidebar({ items, className = '' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} bg-white border-r border-gray-100 flex flex-col transition-all duration-200 ${className}`}
    >
      <div className="p-3 flex justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7M19 19l-7-7 7-7'}
            />
          </svg>
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              item.active
                ? 'bg-teal-50 text-teal-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
}
