'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from '@upllyft/ui';
import { getOrganization, createOrgCommunity } from '@/lib/api/organizations';

export default function CreateOrgCommunityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { toast } = useToast();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    privacy: 'private',
  });

  useEffect(() => {
    getOrganization(slug)
      .then((org) => setOrgId(org.id))
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load organization', variant: 'destructive' });
      });
  }, [slug]);

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'Community name is required', variant: 'destructive' });
      return;
    }
    if (!orgId) {
      toast({ title: 'Error', description: 'Organization not loaded', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await createOrgCommunity(slug, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPrivate: form.privacy === 'private',
        organizationId: orgId,
      });
      toast({ title: 'Success', description: 'Community created successfully' });
      router.push(`/org/${slug}`);
    } catch {
      toast({ title: 'Error', description: 'Failed to create community', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Create New Community</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Community Details</h2>
          <p className="text-sm text-gray-500 mb-4">Create a new space for your organization members.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Community Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Parents of Teens"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What is this community about?"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Privacy</label>
          <Select value={form.privacy} onValueChange={(v) => setForm({ ...form, privacy: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public (Visible to all Org members)</SelectItem>
              <SelectItem value="private">Private (Invite only)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Community'}
          </button>
        </div>
      </div>
    </div>
  );
}
