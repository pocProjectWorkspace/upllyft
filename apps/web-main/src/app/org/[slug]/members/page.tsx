'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Skeleton, useToast } from '@upllyft/ui';
import {
  getOrgMembers,
  inviteOrgMember,
  suspendOrgMember,
  deactivateOrgMember,
  reactivateOrgMember,
  type OrgMember,
} from '@/lib/api/organizations';
import { BulkInviteModal } from '@/components/org/bulk-invite-modal';

type StatusAction = 'suspend' | 'deactivate' | 'reactivate' | null;

export default function OrgMembersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [inviting, setInviting] = useState(false);

  // Bulk invite
  const [bulkOpen, setBulkOpen] = useState(false);

  // Status action
  const [actionMember, setActionMember] = useState<OrgMember | null>(null);
  const [actionType, setActionType] = useState<StatusAction>(null);
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  async function fetchMembers() {
    try {
      const data = await getOrgMembers(slug);
      setMembers(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load members', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, [slug]);

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await inviteOrgMember(slug, { email: inviteEmail, role: inviteRole });
      toast({ title: 'Success', description: 'Invitation sent' });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('Member');
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to invite', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  }

  function openAction(member: OrgMember, action: StatusAction) {
    setActionMember(member);
    setActionType(action);
    setActionReason('');
    setOpenDropdown(null);
  }

  async function handleAction() {
    if (!actionMember || !actionType) return;
    setProcessing(true);
    try {
      if (actionType === 'suspend') await suspendOrgMember(slug, actionMember.id, actionReason || undefined);
      else if (actionType === 'deactivate') await deactivateOrgMember(slug, actionMember.id, actionReason || undefined);
      else if (actionType === 'reactivate') await reactivateOrgMember(slug, actionMember.id);

      const name = actionMember.user?.name || actionMember.user?.email || 'Member';
      const messages: Record<string, string> = {
        suspend: `${name} has been suspended.`,
        deactivate: `${name} has been deactivated.`,
        reactivate: `${name} has been reactivated.`,
      };
      toast({ title: 'Success', description: messages[actionType] });
      setActionMember(null);
      setActionType(null);
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || `Failed to ${actionType}`, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  }

  const statusBadge = (status: OrgMember['status']) => {
    const config: Record<string, { color: 'green' | 'yellow' | 'red' | 'gray' | 'purple'; label: string }> = {
      ACTIVE: { color: 'green', label: 'Active' },
      SUSPENDED: { color: 'yellow', label: 'Suspended' },
      DEACTIVATED: { color: 'red', label: 'Deactivated' },
      PENDING: { color: 'gray', label: 'Pending' },
      REJECTED: { color: 'purple', label: 'Rejected' },
    };
    const c = config[status] || { color: 'gray' as const, label: status };
    return <Badge color={c.color}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Members</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Bulk Invite
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 rounded-xl p-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span className="font-medium text-gray-500">Status:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Suspended</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Deactivated</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      Loading members...
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No members yet. Invite members to get started.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className={
                      m.status === 'DEACTIVATED' ? 'opacity-50' :
                      m.status === 'SUSPENDED' ? 'bg-yellow-50/50' : ''
                    }
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {m.user?.name || 'Unknown'}
                        {m.role === 'ADMIN' && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Admin</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.user?.email || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge color={m.role === 'ADMIN' ? 'purple' : 'gray'}>
                        {m.role === 'ADMIN' ? 'Org Admin' : 'Member'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{statusBadge(m.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === m.id ? null : m.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {openDropdown === m.id && (
                        <div className="absolute right-6 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1">
                          {m.status === 'ACTIVE' && (
                            <>
                              <button onClick={() => openAction(m, 'suspend')} className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50">Suspend</button>
                              <button onClick={() => openAction(m, 'deactivate')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Deactivate</button>
                            </>
                          )}
                          {m.status === 'SUSPENDED' && (
                            <>
                              <button onClick={() => openAction(m, 'reactivate')} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50">Reactivate</button>
                              <button onClick={() => openAction(m, 'deactivate')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Deactivate</button>
                            </>
                          )}
                          {(m.status === 'DEACTIVATED' || m.status === 'PENDING') && (
                            <span className="block px-4 py-2 text-sm text-gray-400">No actions available</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Invite Member</h2>
            <p className="text-sm text-gray-500">Add a user to this organization by email.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              >
                <option value="Member">Member</option>
                <option value="Admin">Org Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setInviteOpen(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation */}
      {actionMember && actionType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className={`text-lg font-semibold ${
              actionType === 'deactivate' ? 'text-red-600' :
              actionType === 'suspend' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {actionType === 'suspend' ? 'Suspend' : actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'} Member
            </h2>
            <p className="text-sm text-gray-600">
              {actionType === 'suspend' && `${actionMember.user?.name || 'This member'} will be temporarily blocked from accessing the organization.`}
              {actionType === 'deactivate' && `${actionMember.user?.name || 'This member'} will permanently lose access and need a new invitation to rejoin.`}
              {actionType === 'reactivate' && `${actionMember.user?.name || 'This member'} will regain full access to the organization.`}
            </p>
            {actionType !== 'reactivate' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setActionMember(null); setActionType(null); }} className="px-4 py-2 text-sm text-gray-600" disabled={processing}>Cancel</button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`rounded-xl px-6 py-2 text-sm font-medium text-white shadow-md disabled:opacity-50 ${
                  actionType === 'deactivate' ? 'bg-red-600 hover:bg-red-700' :
                  actionType === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-green-600 hover:bg-green-700'
                }`}
              >
                {processing ? 'Processing...' : `${actionType === 'suspend' ? 'Suspend' : actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkInviteModal slug={slug} open={bulkOpen} onOpenChange={setBulkOpen} onSuccess={fetchMembers} />
    </div>
  );
}
