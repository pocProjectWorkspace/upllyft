'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@upllyft/ui';
import {
  getOrganizationsWithCommission,
  updateOrganizationCommission,
  type OrgCommission,
} from '@/lib/api/organizations';

export default function OrganizationCommissionsPage() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<OrgCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [globalCommission, setGlobalCommission] = useState(15);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, [search]);

  async function loadOrganizations() {
    try {
      setLoading(true);
      const data = await getOrganizationsWithCommission({ search: search || undefined });
      setOrganizations(data.organizations);
      setGlobalCommission(data.globalCommission);
    } catch {
      toast({ title: 'Error', description: 'Failed to load organizations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(org: OrgCommission) {
    setEditingId(org.id);
    setEditValue(org.commissionPercentage?.toString() || '');
  }

  async function handleSave(orgId: string) {
    const value = editValue.trim();
    const pct = value === '' ? null : parseFloat(value);

    if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) {
      toast({ title: 'Error', description: 'Commission must be between 0 and 100', variant: 'destructive' });
      return;
    }

    try {
      await updateOrganizationCommission(orgId, pct);
      toast({
        title: 'Success',
        description: pct === null ? 'Commission reset to global default' : `Commission updated to ${pct}%`,
      });
      setEditingId(null);
      loadOrganizations();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update', variant: 'destructive' });
    }
  }

  async function handleReset(orgId: string) {
    try {
      await updateOrganizationCommission(orgId, null);
      toast({ title: 'Success', description: 'Commission reset to global default' });
      loadOrganizations();
    } catch {
      toast({ title: 'Error', description: 'Failed to reset commission', variant: 'destructive' });
    }
  }

  if (loading && organizations.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization Commissions</h1>
        <p className="text-sm text-gray-500 mt-1">Manage commission percentages for organizations.</p>
      </div>

      {/* Global commission info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-gray-900">Global Default Commission:</span>
          <span className="text-blue-600 font-bold">{globalCommission}%</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">Organizations without custom rates use this global default.</p>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          placeholder="Search by organization name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custom %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Therapists</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{org.name}</td>
                  <td className="px-6 py-4">
                    {editingId === org.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Default"
                          className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-700">
                        {org.commissionPercentage !== null ? `${org.commissionPercentage}%` : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                      {org.effectiveCommission}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{org.therapistCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{org.totalBookings}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">${org.totalRevenue.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {editingId === org.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(org.id)}
                          className="px-3 py-1 bg-teal-500 text-white text-xs rounded-lg hover:bg-teal-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(org)}
                          className="px-3 py-1 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        {org.commissionPercentage !== null && (
                          <button
                            onClick={() => handleReset(org.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Reset to default"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {organizations.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No organizations found.</div>
        )}
      </div>
    </div>
  );
}
