import { apiClient } from '@upllyft/api-client';

export type EventType = 'THERAPY' | 'WORKSHOP' | 'SUPPORT_GROUP' | 'WEBINAR' | 'COMMUNITY' | 'EDUCATIONAL';
export type EventFormat = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  format: EventFormat;
  coverImage?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  meetingLink?: string;
  meetingPlatform?: string;
  ageGroup?: string;
  languages?: string[];
  accessibilityFeatures?: string[];
  tags: string[];
  interestedCount: number;
  goingCount: number;
  userInterest?: 'INTERESTED' | 'GOING' | null;
  creator: {
    id: string;
    name: string;
    image?: string;
  };
  communityId?: string;
  community?: {
    id: string;
    name: string;
    icon?: string;
  };
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  externalLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventFilters {
  page?: number;
  limit?: number;
  type?: EventType;
  format?: EventFormat;
  search?: string;
  communityId?: string;
  startDate?: string;
  endDate?: string;
}

export interface EventsResponse {
  data: CommunityEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateEventDto {
  title: string;
  description: string;
  type: EventType;
  format: EventFormat;
  coverImage?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  meetingLink?: string;
  meetingPlatform?: string;
  ageGroup?: string;
  languages?: string[];
  accessibilityFeatures?: string[];
  tags?: string[];
  communityId?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  externalLink?: string;
}

export async function getEvents(filters?: EventFilters): Promise<EventsResponse> {
  const { data } = await apiClient.get('/events', { params: filters });
  return data;
}

export async function getEvent(id: string): Promise<CommunityEvent> {
  const { data } = await apiClient.get(`/events/${id}`);
  return data;
}

export async function createEvent(dto: CreateEventDto): Promise<CommunityEvent> {
  const { data } = await apiClient.post('/events', dto);
  return data;
}

export async function updateEvent(id: string, dto: Partial<CreateEventDto>): Promise<CommunityEvent> {
  const { data } = await apiClient.put(`/events/${id}`, dto);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/events/${id}`);
}

export async function markInterest(eventId: string, status: 'INTERESTED' | 'GOING'): Promise<void> {
  await apiClient.post(`/events/${eventId}/interest`, { status });
}

export async function removeInterest(eventId: string): Promise<void> {
  await apiClient.delete(`/events/${eventId}/interest`);
}
