'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Textarea } from '@upllyft/ui';
import { toast } from '@upllyft/ui';
import { formatDate } from '@/lib/utils';
import {
  useDeleteInsight,
  useShareInsight,
  useInsightShares,
  useRevokeInsightShare,
  useSearchTherapists,
} from '@/hooks/use-assessments';
import type { InsightChild, OverallAssessment } from '@/lib/api/insights';

interface CaseInfoHeaderProps {
  conversationId: string;
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

export function CaseInfoHeader({ conversationId, child, assessmentDate, createdAt, riskLevel, diagnosis }: CaseInfoHeaderProps) {
  const router = useRouter();
  const risk = riskLevel ? getRiskBadge(riskLevel) : null;
  const displayDate = assessmentDate || createdAt;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const deleteMutation = useDeleteInsight();
  const { data: shares } = useInsightShares(conversationId);
  const activeShares = shares?.filter(s => s.isActive) || [];

  function handleDelete() {
    deleteMutation.mutate(conversationId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        router.push('/insights');
      },
    });
  }

  return (
    <>
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
              {activeShares.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Shared with {activeShares.map(s => s.therapist.name).join(', ')}
                </span>
              )}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete this analysis?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          conversationId={conversationId}
          activeShares={activeShares}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}

// ── Share Modal ──

function ShareModal({
  conversationId,
  activeShares,
  onClose,
}: {
  conversationId: string;
  activeShares: { id: string; sharedWith: string; therapist: { id: string; name: string; image?: string } }[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [message, setMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: therapists, isLoading: loadingTherapists } = useSearchTherapists(search || undefined);
  const shareMutation = useShareInsight();
  const revokeMutation = useRevokeInsightShare();

  const selectedTherapist = therapists?.find(
    t => t.id === selectedTherapistId,
  );

  function handleShare() {
    if (!selectedTherapistId) return;
    shareMutation.mutate(
      { conversationId, therapistId: selectedTherapistId, message: message || undefined },
      {
        onSuccess: (data) => {
          toast({
            title: 'Analysis shared',
            description: `Shared with ${data.therapist?.name || 'therapist'}`,
          });
          setSelectedTherapistId('');
          setMessage('');
          setSearch('');
        },
      },
    );
  }

  function handleRevoke(therapistId: string) {
    revokeMutation.mutate({ conversationId, therapistId });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Share Analysis</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Currently shared with */}
        {activeShares.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Currently shared with</p>
            <div className="space-y-2">
              {activeShares.map(share => (
                <div key={share.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-700 text-sm font-medium">
                        {share.therapist.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{share.therapist.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(share.sharedWith)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                    disabled={revokeMutation.isPending}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search therapist */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Select a therapist</label>
          <div className="relative">
            <input
              type="text"
              value={selectedTherapist ? selectedTherapist.name : search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedTherapistId('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search therapists..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {showDropdown && !selectedTherapistId && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                {loadingTherapists ? (
                  <div className="p-3 text-sm text-gray-500 text-center">Loading...</div>
                ) : therapists && therapists.length > 0 ? (
                  therapists.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTherapistId(t.id);
                        setSearch('');
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      {t.image ? (
                        <img src={t.image} alt={t.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 text-sm font-medium">{t.name?.[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                        {t.specialization && t.specialization.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">{t.specialization.join(', ')}</p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500 text-center">No therapists found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Add a note for the therapist</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note for the therapist..."
            rows={3}
          />
        </div>

        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          disabled={!selectedTherapistId || shareMutation.isPending}
          className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {shareMutation.isPending ? 'Sharing...' : 'Share Analysis'}
        </button>
      </div>
    </div>
  );
}
