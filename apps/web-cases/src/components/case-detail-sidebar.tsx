'use client';

import { usePathname } from 'next/navigation';
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
  ArrowLeft,
} from 'lucide-react';
import { caseStatusColors, caseStatusLabels } from '@/lib/utils';

const clinicalItems = [
  { segment: '', label: 'Overview', icon: LayoutDashboard },
  { segment: 'sessions', label: 'Sessions', icon: CalendarDays },
  { segment: 'goals', label: 'Goals & IEPs', icon: Target },
  { segment: 'milestones', label: 'Milestones', icon: TrendingUp },
  { segment: 'worksheets', label: 'Worksheets', icon: BookOpen },
];

const adminItems = [
  { segment: 'documents', label: 'Documents', icon: FileText },
  { segment: 'billing', label: 'Billing', icon: DollarSign },
  { segment: 'consents', label: 'Consents', icon: Shield },
  { segment: 'audit', label: 'Audit Log', icon: History },
];

interface CaseDetailSidebarProps {
  caseId: string;
  caseData?: {
    child?: { name?: string; firstName?: string };
    caseNumber?: string;
    status?: string;
  };
}

export function CaseDetailSidebar({ caseId, caseData }: CaseDetailSidebarProps) {
  const pathname = usePathname();

  // Determine active section from URL
  const pathSegments = pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1];
  const activeSegment = lastSegment === caseId ? '' : lastSegment;

  const childName = caseData?.child?.name || caseData?.child?.firstName || 'Patient';
  const caseNumber = caseData?.caseNumber || '';
  const status = caseData?.status || '';

  const renderNavSection = (title: string, items: typeof clinicalItems) => (
    <>
      <p className="px-3 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </p>
      <div className="space-y-0.5 mb-4">
        {items.map((item) => {
          const Icon = item.icon;
          const href = item.segment ? `/${caseId}/${item.segment}` : `/${caseId}`;
          const isActive = activeSegment === item.segment;
          return (
            <a
              key={item.segment || 'overview'}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700 border-l-[3px] border-teal-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-teal-600' : ''}`} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </>
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] flex flex-col shrink-0 sticky top-16">
      {/* Back to Cases */}
      <div className="p-4 border-b border-gray-100">
        <a
          href="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </a>
      </div>

      {/* Patient Info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {childName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{childName}</p>
            <p className="text-xs text-gray-400 font-mono">{caseNumber}</p>
          </div>
        </div>
        {status && (
          <div className="mt-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${caseStatusColors[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {caseStatusLabels[status] ?? status}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {renderNavSection('Clinical', clinicalItems)}
        {renderNavSection('Admin', adminItems)}
      </nav>
    </aside>
  );
}
