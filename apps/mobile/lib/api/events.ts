import api from '../api';
import { EventItem, EventsResponse, GetEventsParams } from '../types/events';

export async function getEvents(params: GetEventsParams = {}): Promise<EventsResponse> {
  const { data } = await api.get('/events', { params });
  return data;
}

export async function getEvent(id: string): Promise<EventItem> {
  const { data } = await api.get(`/events/${id}`);
  return data;
}

export async function toggleInterest(
  eventId: string,
  status: 'INTERESTED' | 'GOING',
): Promise<void> {
  await api.post(`/events/${eventId}/interest`, { status });
}

export async function removeInterest(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}/interest`);
}
