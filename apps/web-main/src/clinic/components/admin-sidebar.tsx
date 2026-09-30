'use client';

import Link from 'next/link';
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
import { useClinicAccess } from '@/clinic/lib/use-clinic-access';

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
    href: '/clinic',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Patients',
    href: '/clinic/patients',
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: 'Therapists',
    href: '/clinic/therapists',
    icon: <Stethoscope className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: "Today's Board",
    href: '/clinic/tracking',
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    label: 'Outcomes',
    href: '/clinic/outcomes',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: <MessageSquare className="w-5 h-5" />,
    disabled: true,
  },
  {
    label: 'Revenue',
    href: '/clinic/reports',
    icon: <CreditCard className="w-5 h-5" />,
    adminOnly: true,
  },
  {
    label: 'Settings',
    href: '/clinic/settings',
    icon: <Settings className="w-5 h-5" />,
    adminOnly: true,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  // Platform admins, and therapists who own their practice.
  const { canManageClinic: isAdmin } = useClinicAccess();

  const visibleItems = allNavItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col min-h-screen sticky top-0">
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/clinic'
              ? pathname === '/clinic'
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
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
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
