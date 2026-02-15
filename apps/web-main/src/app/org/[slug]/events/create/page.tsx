'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from '@upllyft/ui';
import { getOrganization, getOrgCommunities, createOrgEvent, type OrgDetails, type OrgCommunity } from '@/lib/api/organizations';

export default function CreateOrgEventPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { toast } = useToast();

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [communities, setCommunities] = useState<OrgCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scope, setScope] = useState('general');

  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [orgData, comms] = await Promise.all([
          getOrganization(slug),
          getOrgCommunities(slug),
        ]);
        setOrg(orgData);
        setCommunities(comms);
      } catch {
        toast({ title: 'Error', description: 'Failed to load organization data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) {
      toast({ title: 'Error', description: 'Title and start date are required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const isGeneral = scope === 'general';
      await createOrgEvent({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        location: form.location.trim() || undefined,
        organizationId: isGeneral ? org?.id : undefined,
        communityId: isGeneral ? undefined : scope,
      });
      toast({ title: 'Success', description: 'Event created' });
      router.push(`/org/${slug}/events`);
    } catch {
      toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Event</h1>
          <p className="text-sm text-gray-500">Organize a gathering for your organization</p>
        </div>
      </div>

      {/* Scope selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Event Scope</h2>
        <p className="text-sm text-gray-500 mb-3">Choose whether this event is for all communities or a specific one.</p>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General (All Communities)</SelectItem>
            {communities.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {scope === 'general' && (
          <div className="mt-3 p-3 bg-teal-50 rounded-xl">
            <p className="text-sm text-teal-700">This event will be visible across all communities in your organization.</p>
          </div>
        )}
      </div>

      {/* Event form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 mb-2">Event Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Event name"
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What's the event about?"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Online or physical address"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
