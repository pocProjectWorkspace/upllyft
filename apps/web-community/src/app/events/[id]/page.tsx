'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useEvent, useMarkInterest, useRemoveInterest, useDeleteEvent } from '@/hooks/use-events';
import { useAuth } from '@upllyft/api-client';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Skeleton,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@upllyft/ui';

function formatLabel(value: string): string {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function formatDateTime(dateStr: string, timezone?: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const { data: event, isLoading } = useEvent(id);
  const markInterest = useMarkInterest();
  const removeInterest = useRemoveInterest();
  const deleteEvent = useDeleteEvent();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const isCreator = user?.id === event?.creator?.id;

  function handleInterest(status: 'INTERESTED' | 'GOING') {
    if (!event) return;
    if (event.userInterest === status) {
      removeInterest.mutate(event.id);
    } else {
      markInterest.mutate({ eventId: event.id, status });
    }
  }

  function handleDelete() {
    if (!event) return;
    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        router.push('/events');
      },
    });
  }

  if (isLoading) {
    return (
      <CommunityShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CommunityShell>
    );
  }

  if (!event) {
    return (
      <CommunityShell>
        <div className="max-w-3xl mx-auto text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900">Event not found</h2>
          <p className="text-gray-500 mt-2">This event may have been removed or doesn't exist.</p>
          <Link href="/events">
            <Button variant="outline" className="mt-4">Back to Events</Button>
          </Link>
        </div>
      </CommunityShell>
    );
  }

  return (
    <CommunityShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back button */}
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>

        {/* Cover image */}
        {event.coverImage ? (
          <img src={event.coverImage} alt={event.title} className="w-full h-64 sm:h-80 object-cover rounded-2xl" />
        ) : (
          <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
            <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Main content card */}
        <Card className="p-6 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge color="teal">{formatLabel(event.type)}</Badge>
            <Badge color="blue">{formatLabel(event.format)}</Badge>
          </div>

          {/* Title & description */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <p className="text-gray-600 mt-3 whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Date/time */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Date & Time</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-900 font-medium">{formatDateTime(event.startDate, event.timezone)}</p>
                <p className="text-sm text-gray-500">to {formatDateTime(event.endDate, event.timezone)}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Location</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                {(event.format === 'IN_PERSON' || event.format === 'HYBRID') && (
                  <>
                    {event.venue && <p className="text-sm font-medium text-gray-900">{event.venue}</p>}
                    {event.address && <p className="text-sm text-gray-600">{event.address}</p>}
                    {(event.city || event.state) && (
                      <p className="text-sm text-gray-600">
                        {[event.city, event.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </>
                )}
                {(event.format === 'VIRTUAL' || event.format === 'HYBRID') && (
                  <div className={event.format === 'HYBRID' ? 'mt-2' : ''}>
                    {event.meetingPlatform && (
                      <p className="text-sm text-gray-600">Platform: {event.meetingPlatform}</p>
                    )}
                    {event.meetingLink && (
                      <a
                        href={event.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-pink-600 hover:text-pink-700 underline"
                      >
                        Join Meeting
                      </a>
                    )}
                  </div>
                )}
                {event.format === 'VIRTUAL' && !event.meetingLink && !event.meetingPlatform && (
                  <p className="text-sm text-gray-500">Virtual event - details to be shared</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional info */}
          {(event.ageGroup || (event.languages && event.languages.length > 0) || (event.accessibilityFeatures && event.accessibilityFeatures.length > 0)) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.ageGroup && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Age Group: {event.ageGroup}
                  </div>
                )}
                {event.languages && event.languages.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Languages: {event.languages.join(', ')}
                  </div>
                )}
              </div>
              {event.accessibilityFeatures && event.accessibilityFeatures.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {event.accessibilityFeatures.map((feature) => (
                    <Badge key={feature} color="green">{feature}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Contact info */}
          {(event.contactPhone || event.contactEmail || event.contactWhatsapp || event.externalLink) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact</h3>
              <div className="flex flex-wrap gap-3">
                {event.contactPhone && (
                  <a
                    href={`tel:${event.contactPhone}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {event.contactPhone}
                  </a>
                )}
                {event.contactEmail && (
                  <a
                    href={`mailto:${event.contactEmail}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {event.contactEmail}
                  </a>
                )}
                {event.contactWhatsapp && (
                  <a
                    href={`https://wa.me/${event.contactWhatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    </svg>
                    WhatsApp
                  </a>
                )}
                {event.externalLink && (
                  <a
                    href={event.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Creator */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <Avatar name={event.creator.name || 'User'} src={event.creator.image || undefined} size="md" />
            <div>
              <p className="text-sm font-medium text-gray-900">{event.creator.name || 'User'}</p>
              <p className="text-xs text-gray-500">Organizer</p>
            </div>
          </div>

          {/* Interest & actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <div className="flex gap-3 flex-1">
              <Button
                variant={event.userInterest === 'INTERESTED' ? 'secondary' : 'outline'}
                onClick={() => handleInterest('INTERESTED')}
                disabled={markInterest.isPending || removeInterest.isPending}
                className="flex-1 sm:flex-none"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Interested ({event.interestedCount})
              </Button>
              <Button
                variant={event.userInterest === 'GOING' ? 'primary' : 'outline'}
                onClick={() => handleInterest('GOING')}
                disabled={markInterest.isPending || removeInterest.isPending}
                className="flex-1 sm:flex-none"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Going ({event.goingCount})
              </Button>
            </div>

            {isCreator && (
              <div className="flex gap-2">
                <Link href={`/events/${event.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                </Link>
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this event? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 from-red-600 to-red-700"
                      >
                        {deleteEvent.isPending ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </Card>
      </div>
    </CommunityShell>
  );
}
