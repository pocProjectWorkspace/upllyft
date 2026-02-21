'use client';

import { useAuth } from '@upllyft/api-client';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  ClipboardList,
  TrendingUp,
  MessageSquare,
  CreditCard,
  Settings,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  disabled?: boolean;
}

const allNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Patients',
    href: '/patients',
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: 'Therapists',
    href: '/therapists',
    icon: <Stethoscope className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: "Today's Board",
    href: '/tracking',
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    label: 'Outcomes',
    href: '/outcomes',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: <MessageSquare className="w-5 h-5" />,
    disabled: true,
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: <CreditCard className="w-5 h-5" />,
    adminOnly: true,
    disabled: true,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-5 h-5" />,
    adminOnly: true,
    disabled: true,
  },
];

export function AdminSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.role === 'ADMIN';

  const visibleItems = allNavItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col min-h-screen sticky top-0">
      {/* Branding */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">U</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Upllyft</h1>
            <p className="text-xs text-gray-500">Clinic Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed"
                title="Coming soon"
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              </div>
            );
          }

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

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">
          {isAdmin ? 'Admin Access' : 'Therapist Access'}
        </div>
      </div>
    </aside>
  );
}
