'use client';

import { AdminShell } from '@/components/admin-shell';
import { TrendingUp } from 'lucide-react';

export default function OutcomesPage() {
  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outcomes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Clinical outcome snapshots and progress metrics
          </p>
        </div>

        {/* Placeholder */}
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Outcome Snapshot Dashboard
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            The outcome dashboard with aggregate progress charts, goal
            completion rates, and domain breakdowns will be built in Feature 07.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
