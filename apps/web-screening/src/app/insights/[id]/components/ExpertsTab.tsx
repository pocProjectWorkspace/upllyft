'use client';

import { Badge } from '@upllyft/ui';
import { APP_URLS } from '@upllyft/api-client';
import type { ExpertConnection } from '@/lib/api/insights';

interface ExpertsTabProps {
  experts: ExpertConnection[];
}

function getRoleBadge(role: string): { color: 'green' | 'purple'; label: string } {
  if (role === 'THERAPIST') return { color: 'green', label: 'Therapist' };
  if (role === 'EDUCATOR') return { color: 'purple', label: 'Educator' };
  return { color: 'green', label: role };
}

export function ExpertsTab({ experts }: ExpertsTabProps) {
  if (experts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center fade-in">
        <p className="text-gray-500">No matching experts found for this analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Expert Connections</h2>
      {experts.map((expert, idx) => {
        const roleBadge = getRoleBadge(expert.role);
        return (
          <div key={expert.id || idx} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{expert.name}</h3>
                  {/* Verified badge */}
                  <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    roleBadge.color === 'green' ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {roleBadge.label}
                  </span>
                  {expert.organization && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {expert.organization}
                    </span>
                  )}
                </div>
              </div>
              <Badge color="green">{Math.round(expert.trustScore * 100)}%</Badge>
            </div>

            {/* Specializations */}
            {expert.specialization.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {expert.specialization.map(spec => (
                  <span key={spec} className="inline-flex px-2.5 py-1 border border-teal-200 text-teal-700 text-xs rounded-full">
                    {spec}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span>{expert.yearsOfExperience} years experience</span>
              {expert._count && (
                <>
                  <span>&middot;</span>
                  <span>{expert._count.posts + expert._count.comments} contributions</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {expert.id && (
                <>
                  <a
                    href={`${APP_URLS.booking}/therapists/${expert.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Connect
                  </a>
                  <a
                    href={`${APP_URLS.main}/profile/${expert.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Profile
                  </a>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
