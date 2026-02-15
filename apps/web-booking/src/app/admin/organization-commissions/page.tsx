'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@upllyft/api-client';
import { Card, Input, Button, Avatar, Badge, useToast } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import {
  getOrganizationsWithCommission,
  updateOrganizationCommission,
  type OrganizationCommission,
} from '@/lib/api/marketplace-admin';

export default function OrganizationCommissionsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    fetchOrganizations();
  }, [authLoading, isAuthenticated, user]);

  async function fetchOrganizations() {
    try {
      setLoading(true);
      const result = await getOrganizationsWithCommission({ search: search || undefined });
      setOrganizations(result.organizations);
    } catch {
      toast({ title: 'Error', description: 'Failed to load organizations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(orgId: string) {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0 || value > 100) {
      toast({ title: 'Error', description: 'Commission must be between 0 and 100', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updateOrganizationCommission(orgId, value);
      toast({ title: 'Updated', description: 'Organization commission updated' });
      setEditingId(null);
      fetchOrganizations();
    } catch {
      toast({ title: 'Error', description: 'Failed to update commission', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Organization Commissions</h1>
            <p className="text-sm text-gray-500 mt-1">Manage commission rates for partner organizations</p>
          </div>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrganizations()}
            className="max-w-sm"
          />
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Organization</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Therapists</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Bookings</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Revenue</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Commission</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={org.name} src={org.logo} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-xs text-gray-400">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{org.therapistCount}</td>
                    <td className="px-4 py-3 text-gray-600">{org.totalBookings}</td>
                    <td className="px-4 py-3 text-gray-600">${org.totalRevenue.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {editingId === org.id ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20"
                        />
                      ) : (
                        <Badge color={org.customCommission != null ? 'blue' : 'gray'}>
                          {org.effectiveCommission}%
                          {org.customCommission != null && ' (custom)'}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === org.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="primary" onClick={() => handleSave(org.id)} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(org.id);
                            setEditValue(String(org.customCommission ?? org.effectiveCommission));
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {organizations.length === 0 && (
            <div className="text-center py-12 text-gray-500">No organizations found</div>
          )}
        </Card>
      </main>
    </div>
  );
}
