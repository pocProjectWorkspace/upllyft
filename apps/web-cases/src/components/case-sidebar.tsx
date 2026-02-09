'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  TrendingUp,
  FileText,
  Shield,
  DollarSign,
  BookOpen,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type CaseSection =
  | 'overview'
  | 'sessions'
  | 'ieps'
  | 'milestones'
  | 'documents'
  | 'consents'
  | 'billing'
  | 'worksheets'
  | 'audit';

interface CaseSidebarProps {
  activeSection: CaseSection;
  onSectionChange: (section: CaseSection) => void;
}

const clinicalItems: { key: CaseSection; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'sessions', label: 'Sessions', icon: <CalendarDays className="h-4 w-4" /> },
  { key: 'ieps', label: 'IEPs', icon: <Target className="h-4 w-4" /> },
  { key: 'milestones', label: 'Milestones', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'worksheets', label: 'Worksheets', icon: <BookOpen className="h-4 w-4" /> },
];

const adminItems: { key: CaseSection; label: string; icon: React.ReactNode }[] = [
  { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { key: 'billing', label: 'Billing', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'consents', label: 'Consents', icon: <Shield className="h-4 w-4" /> },
  { key: 'audit', label: 'Audit Log', icon: <History className="h-4 w-4" /> },
];

export function CaseSidebar({ activeSection, onSectionChange }: CaseSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-52'} bg-white border-r border-gray-100 flex flex-col transition-all duration-200 min-h-[calc(100vh-64px)]`}
    >
      <div className="p-3 flex justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 px-2">
        {!collapsed && (
          <p className="px-3 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Clinical
          </p>
        )}
        <div className="space-y-0.5 mb-4">
          {clinicalItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeSection === item.key
                  ? 'bg-teal-50 text-teal-700 border-l-2 border-teal-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {!collapsed && (
          <p className="px-3 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Admin
          </p>
        )}
        <div className="space-y-0.5">
          {adminItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeSection === item.key
                  ? 'bg-teal-50 text-teal-700 border-l-2 border-teal-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>
    </aside>
  );
}
