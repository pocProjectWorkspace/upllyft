'use client';

// Leave Management — a per-therapist holiday/leave record screen, split out of the
// Add Therapist wizard's Schedule step. Reads/writes the SAME AvailabilityException
// records the therapist edits from their own Hub Absence panel.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, useToast } from '@upllyft/ui';
import {
  getOrgMember,
  getMemberLeave,
  addMemberLeave,
  removeMemberLeave,
  type OrgMember,
  type LeaveRecord,
} from '@/lib/api/organizations';

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none';

function fmt(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString();
}

export default function LeaveManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug as string;
  const memberId = params.memberId as string;

  const [member, setMember] = useState<OrgMember | null>(null);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  async function loadLeave() {
    try {
      const data = await getMemberLeave(slug, memberId);
      setRecords(data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to load leave records',
        variant: 'destructive',
      });
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await getOrgMember(slug, memberId);
        if (active) setMember(m ?? null);
        await loadLeave();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, memberId]);

  const sorted = useMemo(
    () => records.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [records],
  );
  const upcoming = sorted.filter((r) => r.date.slice(0, 10) >= today);
  const daysThisYear = sorted.filter((r) => r.date.slice(0, 4) === today.slice(0, 4)).length;
  const nextDate = upcoming[0]?.date.slice(0, 10);

  async function handleAdd() {
    if (!fromDate) {
      toast({ title: 'Pick a start date', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await addMemberLeave(slug, memberId, {
        fromDate,
        toDate: toDate || undefined,
        reason: reason || undefined,
      });
      setFromDate('');
      setToDate('');
      setReason('');
      await loadLeave();
      toast({ title: 'Leave added' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to add leave',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeMemberLeave(slug, memberId, id);
      setRecords((r) => r.filter((x) => x.id !== id));
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to remove leave',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
        <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        Loading leave…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button
          onClick={() => router.push(`/org/${slug}/members/${memberId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          ← Back to member setup
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          Leave &amp; holidays — {member?.user?.name || member?.user?.email || 'Member'}
        </h1>
        <p className="text-sm text-gray-500">
          These dates block bookings and are visible on the therapist&apos;s own schedule.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Upcoming leave</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{upcoming.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Days off this year</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{daysThisYear}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Next unavailable</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{nextDate ? fmt(nextDate) : '—'}</p>
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input className={inputCls} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To (optional)</label>
          <input className={inputCls} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual leave" />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="px-4 py-2.5 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40"
        >
          {saving ? 'Adding…' : '+ Add record'}
        </button>
      </div>

      {/* Records */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No leave records yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sorted.map((rec) => {
              const past = rec.date.slice(0, 10) < today;
              return (
                <div key={rec.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{fmt(rec.date)}</span>
                    {rec.reason && <span className="text-sm text-gray-500">— {rec.reason}</span>}
                    <Badge color={past ? 'gray' : 'green'}>{past ? 'Past' : 'Upcoming'}</Badge>
                  </div>
                  <button onClick={() => handleRemove(rec.id)} className="text-sm text-gray-400 hover:text-red-500">
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
