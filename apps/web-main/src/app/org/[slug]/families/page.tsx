'use client';

// Family Intake Journey — review families/children who have submitted intake,
// preview their details, assign a therapist, and grant platform access.
// Scoped to this org's cases (Case.organizationId).

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, useToast } from '@upllyft/ui';
import {
  getOrgFamilies,
  getOrgFamilyDetail,
  getOrgTherapists,
  assignOrgFamilyTherapist,
  grantOrgFamilyAccess,
  type OrgFamily,
  type OrgFamilyDetail,
  type OrgTherapistOption,
} from '@/lib/api/organizations';

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

export default function FamiliesPage() {
  const { toast } = useToast();
  const params = useParams();
  const slug = params.slug as string;

  const [families, setFamilies] = useState<OrgFamily[]>([]);
  const [therapists, setTherapists] = useState<OrgTherapistOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrgFamilyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [granting, setGranting] = useState(false);

  async function loadFamilies() {
    try {
      const [fams, ts] = await Promise.all([getOrgFamilies(slug), getOrgTherapists(slug)]);
      setFamilies(fams);
      setTherapists(ts);
    } catch {
      toast({ title: 'Error', description: 'Failed to load families', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFamilies();
  }, [slug]);

  async function openDetail(caseId: string) {
    setSelectedId(caseId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await getOrgFamilyDetail(slug, caseId);
      setDetail(d);
      setAssignTo(d.primaryTherapist?.id ?? '');
    } catch {
      toast({ title: 'Error', description: 'Failed to load family', variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedId || !assignTo) return;
    setAssigning(true);
    try {
      await assignOrgFamilyTherapist(slug, selectedId, assignTo);
      toast({ title: 'Therapist assigned' });
      await Promise.all([loadFamilies(), openDetail(selectedId)]);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to assign',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  }

  async function handleGrantAccess() {
    if (!selectedId) return;
    setGranting(true);
    try {
      const res = await grantOrgFamilyAccess(slug, selectedId);
      toast({ title: 'Access granted', description: res.message });
      await Promise.all([loadFamilies(), openDetail(selectedId)]);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to grant access',
        variant: 'destructive',
      });
    } finally {
      setGranting(false);
    }
  }

  const primaryGuardian = detail?.child.guardians.find((g) => g.isPrimaryContact) ?? detail?.child.guardians[0];
  const accessGranted = !!detail?.accessGranted;
  // Prefer a guardian record; fall back to the child's profile-owner account.
  const contactEmail = primaryGuardian?.email ?? detail?.profileOwner?.email ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Families</h1>
        <p className="text-sm text-gray-500">Review intake submissions, assign a therapist, and grant platform access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Therapist</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      Loading families…
                    </div>
                  </td>
                </tr>
              ) : families.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                    No families yet. Submitted intakes will appear here.
                  </td>
                </tr>
              ) : (
                families.map((f) => (
                  <tr
                    key={f.caseId}
                    onClick={() => openDetail(f.caseId)}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedId === f.caseId ? 'bg-teal-50/50' : ''}`}
                  >
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{f.childName}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{f.parentName ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{fmtDate(f.submittedAt)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{f.assignedTherapistName ?? <span className="text-gray-400">Unassigned</span>}</td>
                    <td className="px-5 py-4">
                      <Badge color={f.status === 'ACCESS_GRANTED' ? 'green' : 'yellow'}>
                        {f.status === 'ACCESS_GRANTED' ? 'Access granted' : 'Pending review'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              Select a family to preview their intake.
            </div>
          ) : detailLoading || !detail ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Child */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Child</h3>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-gray-900">{detail.child.firstName}{detail.child.nickname ? ` (${detail.child.nickname})` : ''}</dd>
                  <dt className="text-gray-500">Date of birth</dt>
                  <dd className="text-gray-900">{fmtDate(detail.child.dateOfBirth)}</dd>
                  <dt className="text-gray-500">Gender</dt>
                  <dd className="text-gray-900">{detail.child.gender || '—'}</dd>
                </dl>
              </div>

              {/* Parent / Guardian */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Parent / Guardian</h3>
                {primaryGuardian ? (
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="text-gray-900">{primaryGuardian.fullName}</dd>
                    <dt className="text-gray-500">Relationship</dt>
                    <dd className="text-gray-900">{primaryGuardian.relationship}</dd>
                    <dt className="text-gray-500">Email</dt>
                    <dd className="text-gray-900 break-all">{primaryGuardian.email ?? '—'}</dd>
                    <dt className="text-gray-500">Phone</dt>
                    <dd className="text-gray-900">{primaryGuardian.phone ?? '—'}</dd>
                  </dl>
                ) : detail.profileOwner ? (
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="text-gray-900">{detail.profileOwner.name ?? '—'}</dd>
                    <dt className="text-gray-500">Email</dt>
                    <dd className="text-gray-900 break-all">{detail.profileOwner.email ?? '—'}</dd>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-400">No guardian on file.</p>
                )}
              </div>

              {/* Intake summary */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Intake summary</h3>
                {detail.intake ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500">Presenting concern</p>
                      <p className="text-gray-900">{detail.intake.presentingConcern || '—'}</p>
                    </div>
                    {detail.intake.referralQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {detail.intake.referralQuestions.map((q) => (
                          <span key={q} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{q}</span>
                        ))}
                      </div>
                    )}
                    {detail.intake.aiSummary && (
                      <div>
                        <p className="text-gray-500">Summary</p>
                        <p className="text-gray-900">{detail.intake.aiSummary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No intake submitted yet.</p>
                )}
              </div>

              {/* Assign & activate */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Assign &amp; activate</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Therapist</label>
                  <div className="flex gap-2">
                    <select
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    >
                      <option value="">Select therapist…</option>
                      {therapists.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssign}
                      disabled={!assignTo || assigning || assignTo === detail.primaryTherapist?.id}
                      className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40"
                    >
                      {assigning ? 'Saving…' : 'Assign'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleGrantAccess}
                  disabled={granting || !contactEmail}
                  title={!contactEmail ? 'Add a guardian email first' : undefined}
                  className="w-full px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40"
                >
                  {granting ? 'Sending…' : accessGranted ? 'Resend access email' : 'Grant Platform Access'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
