export type EventFormat = 'VIRTUAL' | 'IN_PERSON' | 'HYBRID';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type InterestStatus = 'INTERESTED' | 'GOING';

export interface EventCreator {
  id: string;
  name: string | null;
  image: string | null;
  verificationStatus: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  eventType: string;
  format: EventFormat;
  startDate: string;
  endDate: string | null;
  timezone: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  location: string | null;
  meetingLink: string | null;
  virtualLink: string | null;
  tags: string[];
  interestedCount: number;
  attendeeCount: number;
  maxAttendees: number | null;
  status: EventStatus;
  isPublic: boolean;
  creator: EventCreator;
  _count: { interests: number };
  userInterest: InterestStatus | null;
  createdAt: string;
}

export interface EventsResponse {
  events: EventItem[];
  total: number;
  hasMore: boolean;
}

export interface GetEventsParams {
  limit?: number;
  offset?: number;
  format?: EventFormat;
  search?: string;
  sortBy?: 'startDate' | 'createdAt' | 'interestedCount';
  order?: 'asc' | 'desc';
}
