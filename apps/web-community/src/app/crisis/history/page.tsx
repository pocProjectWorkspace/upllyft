'use client';

import { CommunityShell } from '@/components/community-shell';
import { Badge } from '@upllyft/ui';
import { useMyCrisisIncidents } from '@/hooks/use-crisis';

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const STATUS_BADGE: Record<string, { color: 'green' | 'red' | 'yellow' | 'gray'; label: string }> = {
  RESOLVED: { color: 'green', label: 'Resolved' },
  ACTIVE: { color: 'red', label: 'Active' },
  IN_PROGRESS: { color: 'yellow', label: 'In Progress' },
};

const TYPE_LABELS: Record<string, string> = {
  SUICIDE_RISK: 'Thoughts of self-harm',
  PANIC_ATTACK: 'Panic/Anxiety attack',
  MELTDOWN: 'Meltdown/Sensory overload',
  FAMILY_CONFLICT: 'Family/Relationship crisis',
  MEDICAL_EMERGENCY: 'Medical emergency',
  BURNOUT: 'Feeling overwhelmed',
};

function getTypeIcon(type: string) {
  switch (type) {
    case 'SUICIDE_RISK':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'PANIC_ATTACK':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'FAMILY_CONFLICT':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
      );
    case 'MEDICAL_EMERGENCY':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
      );
  }
}

export default function CrisisHistoryPage() {
  const { data: incidents, isLoading } = useMyCrisisIncidents();

  return (
    <CommunityShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/crisis" className="p-2 hover:bg-gray-100 rounded-xl">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Crisis History</h1>
            <p className="text-sm text-gray-500 mt-0.5">View past crisis support events and their outcomes</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!incidents || incidents.length === 0) && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Crisis Records</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
              There are no crisis intervention records to display. This is a good thing!
            </p>
            <a
              href="/crisis"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Crisis Hub
            </a>
          </div>
        )}

        {/* Incidents list */}
        {!isLoading && incidents && incidents.length > 0 && (
          <div className="space-y-3">
            {incidents.map((incident) => {
              const statusInfo = STATUS_BADGE[incident.status] || { color: 'gray' as const, label: incident.status };
              return (
                <div key={incident.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{getTypeIcon(incident.type)}</span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {TYPE_LABELS[incident.type] || incident.type.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-500">{formatTimeAgo(incident.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
                  </div>

                  {/* Details */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {incident.urgencyLevel && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Urgency: {incident.urgencyLevel}
                      </span>
                    )}
                    {incident.connections && incident.connections.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                        {incident.connections.length} resource{incident.connections.length !== 1 ? 's' : ''} used
                      </span>
                    )}
                  </div>

                  {/* Follow-up notice */}
                  {incident.followupScheduled && incident.status !== 'RESOLVED' && (
                    <div className="mt-3 border border-blue-100 bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-700">
                        Follow-up scheduled: {formatTimeAgo(incident.followupScheduled)}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {incident.description && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">{incident.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CommunityShell>
  );
}
