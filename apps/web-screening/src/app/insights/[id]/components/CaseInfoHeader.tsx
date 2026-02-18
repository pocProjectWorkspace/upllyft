'use client';

import { Badge } from '@upllyft/ui';
import { formatDate } from '@/lib/utils';
import type { InsightChild, OverallAssessment, CaseParameters } from '@/lib/api/insights';

interface CaseInfoHeaderProps {
  child?: InsightChild;
  assessmentDate?: string;
  createdAt?: string;
  riskLevel?: OverallAssessment['riskLevel'];
  diagnosis?: string[];
}

function getRiskBadge(level: string): { color: 'green' | 'yellow' | 'red'; label: string } {
  if (level === 'high') return { color: 'red', label: 'High Risk' };
  if (level === 'moderate') return { color: 'yellow', label: 'Moderate Risk' };
  return { color: 'green', label: 'Low Risk' };
}

export function CaseInfoHeader({ child, assessmentDate, createdAt, riskLevel, diagnosis }: CaseInfoHeaderProps) {
  const risk = riskLevel ? getRiskBadge(riskLevel) : null;
  const displayDate = assessmentDate || createdAt;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Avatar */}
        {child && (
          <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
            <span className="text-teal-700 font-bold text-xl">
              {child.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              {child?.name || 'Clinical Analysis'}
            </h1>
            {risk && <Badge color={risk.color}>{risk.label}</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
            {child?.age && <span>{child.age}</span>}
            {child?.age && displayDate && <span>&middot;</span>}
            {displayDate && <span>{formatDate(displayDate)}</span>}
          </div>
          {diagnosis && diagnosis.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {diagnosis.map(d => (
                <Badge key={d} color="purple">{d}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
