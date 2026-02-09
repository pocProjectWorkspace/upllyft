'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCases } from '@/hooks/use-cases';
import type { Case } from '@/lib/api/cases';
import {
  FolderOpen,
  CheckCircle,
  Clock,
  PauseCircle,
  Archive,
  XCircle,
  Plus,
  TrendingUp,
  CalendarDays,
  FileText,
} from 'lucide-react';

const statusItems = [
  { key: 'ALL', label: 'All Cases', icon: FolderOpen, color: 'text-gray-600' },
  { key: 'ACTIVE', label: 'Active', icon: CheckCircle, color: 'text-green-600' },
  { key: 'INTAKE', label: 'Intake', icon: Clock, color: 'text-blue-600' },
  { key: 'ON_HOLD', label: 'On Hold', icon: PauseCircle, color: 'text-yellow-600' },
  { key: 'DISCHARGED', label: 'Discharged', icon: Archive, color: 'text-gray-500' },
  { key: 'CLOSED', label: 'Closed', icon: XCircle, color: 'text-gray-400' },
];

export function CasesSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || 'ALL';

  // Fetch all cases for counts
  const { data: allData } = useCases({ limit: 100 });
  const cases: Case[] = allData?.data ?? [];

  const counts: Record<string, number> = {
    ALL: cases.length,
    ACTIVE: cases.filter((c) => c.status === 'ACTIVE').length,
    INTAKE: cases.filter((c) => c.status === 'INTAKE').length,
    ON_HOLD: cases.filter((c) => c.status === 'ON_HOLD').length,
    DISCHARGED: cases.filter((c) => c.status === 'DISCHARGED').length,
    CLOSED: cases.filter((c) => c.status === 'CLOSED').length,
  };

  const recentCases = cases.slice(0, 5);

  const handleStatusClick = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.delete('page');
    router.push(`/?${params.toString()}`);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] flex flex-col shrink-0 sticky top-16">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Case Management</h2>
        <p className="text-xs text-gray-500 mt-0.5">{cases.length} total cases</p>
      </div>

      {/* New Case Button */}
      <div className="px-3 pt-4">
        <button
          onClick={() => router.push('/new')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-teal-700 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Case
        </button>
      </div>

      {/* Status Filters */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Status
        </p>
        <div className="space-y-0.5">
          {statusItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentStatus === item.key;
            const count = counts[item.key] ?? 0;
            return (
              <button
                key={item.key}
                onClick={() => handleStatusClick(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 border-l-[3px] border-teal-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-teal-600' : item.color}`} />
                <span className="flex-1 text-left">{item.label}</span>
                <span className={`text-xs tabular-nums ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-6">
          <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Quick Stats
          </p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-teal-600">{counts.ACTIVE}</p>
                <p className="text-xs text-gray-500">Active Cases</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-teal-600">{counts.INTAKE}</p>
                <p className="text-xs text-gray-500">Pending Intake</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-teal-600">{counts.ON_HOLD}</p>
                <p className="text-xs text-gray-500">On Hold</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        {recentCases.length > 0 && (
          <div className="mt-6">
            <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Recent Cases
            </p>
            <div className="space-y-0.5">
              {recentCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/${c.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-teal-700">
                      {(c.child?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="truncate text-sm font-medium">{c.child?.name || 'Unknown'}</p>
                    <p className="text-[11px] text-gray-400 truncate font-mono">{c.caseNumber}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
