'use client';

import { useState, useEffect } from 'react';
import { X, Search, UserCheck } from 'lucide-react';
import { getTherapists, assignTherapist, type TherapistOption } from '@/lib/admin-api';
import { Avatar } from '@upllyft/ui';

interface AssignTherapistModalProps {
  childId: string;
  childName: string;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignTherapistModal({
  childId,
  childName,
  open,
  onClose,
  onAssigned,
}: AssignTherapistModalProps) {
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getTherapists()
        .then(setTherapists)
        .catch(() => setTherapists([]))
        .finally(() => setLoading(false));
      setSelectedId(null);
      setSearch('');
    }
  }, [open]);

  if (!open) return null;

  const filtered = therapists.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.specializations?.some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );

  const handleAssign = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await assignTherapist(childId, selectedId);
      onAssigned();
      onClose();
    } catch {
      // toast error would go here
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Therapist</h2>
            <p className="text-sm text-gray-500 mt-0.5">for {childName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or specialty..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Therapist List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              {search ? 'No therapists match your search' : 'No therapists available'}
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                  selectedId === t.id
                    ? 'bg-teal-50 ring-2 ring-teal-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Avatar name={t.name || ''} src={t.avatar || undefined} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.title || t.specializations?.join(', ') || t.email}
                  </p>
                </div>
                {selectedId === t.id && (
                  <UserCheck className="w-5 h-5 text-teal-600 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedId || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            Assign & Create Case
          </button>
        </div>
      </div>
    </div>
  );
}
