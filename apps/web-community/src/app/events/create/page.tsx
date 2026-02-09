'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useCreateEvent } from '@/hooks/use-events';
import type { EventType, EventFormat, CreateEventDto } from '@/lib/api/events';
import {
  Button,
  Card,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SUPPORT_GROUP', label: 'Support Group' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'EDUCATIONAL', label: 'Educational' },
];

const EVENT_FORMATS: { value: EventFormat; label: string }[] = [
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export default function CreateEventPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('COMMUNITY');
  const [format, setFormat] = useState<EventFormat>('VIRTUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingPlatform, setMeetingPlatform] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const showPhysical = format === 'IN_PERSON' || format === 'HYBRID';
  const showVirtual = format === 'VIRTUAL' || format === 'HYBRID';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const dto: CreateEventDto = {
      title,
      description,
      type,
      format,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      ...(showPhysical && { venue, address, city, state }),
      ...(showVirtual && { meetingLink, meetingPlatform }),
      ...(tags.length > 0 && { tags }),
      ...(contactPhone && { contactPhone }),
      ...(contactEmail && { contactEmail }),
    };

    createEvent.mutate(dto, {
      onSuccess: (event) => {
        router.push(`/events/${event.id}`);
      },
    });
  }

  return (
    <CommunityShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
          <p className="text-gray-500 mt-1">Share an event with the community</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your event..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="mt-1.5"
              />
            </div>

            {/* Type & Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(val) => setType(val as EventType)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={format} onValueChange={(val) => setFormat(val as EventFormat)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date & Time</Label>
                <input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date & Time</Label>
                <input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Physical location fields */}
            {showPhysical && (
              <div className="space-y-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <h3 className="text-sm font-semibold text-gray-900">Venue Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Venue Name"
                    placeholder="e.g., Community Center"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                  <Input
                    label="Address"
                    placeholder="Street address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <Input
                    label="City"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <Input
                    label="State"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Virtual fields */}
            {showVirtual && (
              <div className="space-y-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                <h3 className="text-sm font-semibold text-gray-900">Virtual Meeting Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Meeting Link"
                    placeholder="https://zoom.us/..."
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                  />
                  <Input
                    label="Platform"
                    placeholder="e.g., Zoom, Google Meet"
                    value={meetingPlatform}
                    onChange={(e) => setMeetingPlatform(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Separate tags with commas (e.g., autism, therapy, workshop)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated list of tags</p>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Phone"
                placeholder="+1 (555) 000-0000"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
              <Input
                label="Contact Email"
                type="email"
                placeholder="contact@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
              <Link href="/events">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </CommunityShell>
  );
}
