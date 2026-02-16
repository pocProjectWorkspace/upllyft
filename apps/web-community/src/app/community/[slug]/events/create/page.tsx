'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Input, Textarea, Label } from '@upllyft/ui';
import { CommunityShell } from '@/components/community-shell';
import { useCreateEvent } from '@/hooks/use-events';
import type { EventType, EventFormat } from '@/lib/api/events';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'THERAPY', label: 'Therapy Session' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SUPPORT_GROUP', label: 'Support Group' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'COMMUNITY', label: 'Community Meetup' },
  { value: 'EDUCATIONAL', label: 'Educational' },
];

const EVENT_FORMATS: { value: EventFormat; label: string }[] = [
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export default function CreateCommunityEventPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const createEvent = useCreateEvent();

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'COMMUNITY' as EventType,
    format: 'VIRTUAL' as EventFormat,
    startDate: '',
    endDate: '',
    venue: '',
    meetingLink: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createEvent.mutate(
      { ...form, communityId: slug },
      { onSuccess: () => router.push(`/community/${slug}/events`) },
    );
  }

  return (
    <CommunityShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Create Event</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Event Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g., Monthly Support Group Meeting" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={4} placeholder="Describe your event..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none">
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Format</Label>
                <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as EventFormat }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none">
                  {EVENT_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date & Time</Label>
                <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div>
                <Label>End Date & Time</Label>
                <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>
            {(form.format === 'IN_PERSON' || form.format === 'HYBRID') && (
              <div>
                <Label>Venue</Label>
                <Input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Event venue address" />
              </div>
            )}
            {(form.format === 'VIRTUAL' || form.format === 'HYBRID') && (
              <div>
                <Label>Meeting Link</Label>
                <Input value={form.meetingLink} onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))} placeholder="https://zoom.us/..." />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={createEvent.isPending}>
                {createEvent.isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </CommunityShell>
  );
}
