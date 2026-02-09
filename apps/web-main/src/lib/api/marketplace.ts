import { apiClient } from '@upllyft/api-client';

export interface TherapistAnalytics {
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  upcomingSessions: number;
  pendingRequests: number;
}

export interface Booking {
  id: string;
  therapistId: string;
  clientId: string;
  sessionTypeId: string;
  startDateTime: string;
  endDateTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  notes?: string;
  totalAmount?: number;
  client?: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
  therapist?: {
    id: string;
    user: {
      name?: string;
      email: string;
      image?: string;
    };
  };
  sessionType?: {
    id: string;
    name: string;
    duration: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TherapistProfile {
  id: string;
  userId: string;
  specializations: string[];
  bio?: string;
  yearsOfExperience?: number;
  hourlyRate?: number;
  isAvailable: boolean;
  stripeAccountId?: string;
  user: {
    name?: string;
    email: string;
    image?: string;
  };
}

export async function getTherapistAnalytics(): Promise<TherapistAnalytics> {
  const { data } = await apiClient.get<TherapistAnalytics>('/marketplace/therapists/me/analytics');
  return data;
}

export async function getMyBookings(status?: string): Promise<Booking[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const { data } = await apiClient.get<Booking[]>('/marketplace/bookings', { params });
  return data;
}

export async function getMyTherapistProfile(): Promise<TherapistProfile> {
  const { data } = await apiClient.get<TherapistProfile>('/marketplace/therapists/me/profile');
  return data;
}

export async function acceptBooking(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/marketplace/bookings/${bookingId}/accept`);
  return data;
}

export async function rejectBooking(bookingId: string, reason: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/marketplace/bookings/${bookingId}/reject`, { reason });
  return data;
}
