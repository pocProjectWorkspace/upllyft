'use client';

import { useAuditLogs, useAuditSummary } from '@/hooks/use-cases';
import type { AuditLog, AuditSummary } from '@/lib/api/cases';
import { auditActionColors, formatDateTime } from '@/lib/utils';
import { Card, Skeleton } from '@upllyft/ui';
import { History, User } from 'lucide-react';

export function AuditTab({ caseId }: { caseId: string }) {
  const { data: logs, isLoading } = useAuditLogs(caseId);
  const { data: summary } = useAuditSummary(caseId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const items: AuditLog[] = Array.isArray(logs?.data) ? logs.data : Array.isArray(logs) ? logs : [];
  const summaryData = summary as AuditSummary | undefined;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h2>

      {summaryData?.actionsByType && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Object.entries(summaryData.actionsByType).map(([action, count]) => {
            const label = action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
            return (
              <Card key={action} className="p-3 border border-gray-100 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </Card>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No audit entries</h3>
          <p className="text-sm text-gray-500">Activity on this case will be logged here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((entry, idx) => {
            const action = entry.action ?? '';
            const description = (entry as Record<string, unknown>).description as string ?? '';
            const createdAt = entry.timestamp ?? '';
            const userName = entry.user?.name ?? 'System';

            return (
              <Card key={idx} className="p-3 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            auditActionColors[action] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">by {userName}</span>
                      </div>
                      {description && (
                        <p className="text-sm text-gray-600">{description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDateTime(createdAt)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
