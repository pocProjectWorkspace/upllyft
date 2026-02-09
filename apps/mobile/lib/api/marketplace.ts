import api from '../api';
import { TherapistProfile, SessionType, TimeSlot, Booking, SessionRating } from '../types/marketplace';

export interface TherapistsResponse {
  therapists: TherapistProfile[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export interface TherapistFilters {
  page?: number;
  limit?: number;
  specialization?: string;
  language?: string;
  minRating?: number;
}

export async function getTherapists(filters: TherapistFilters = {}): Promise<TherapistsResponse> {
  const { data } = await api.get('/marketplace/therapists', { params: filters });
  return data;
}

export async function getTherapist(id: string): Promise<TherapistProfile> {
  const { data } = await api.get(`/marketplace/therapists/${id}`);
  return data;
}

export async function getSessionTypes(therapistId: string): Promise<SessionType[]> {
  const { data } = await api.get(`/marketplace/therapists/${therapistId}/session-types`);
  return data;
}

export async function getAvailableSlots(therapistId: string, date: string, sessionTypeId: string, timezone?: string): Promise<TimeSlot[]> {
  const { data } = await api.get(`/marketplace/therapists/${therapistId}/slots`, {
    params: { date, sessionTypeId, timezone },
  });
  return data;
}

export interface CreateBookingData {
  therapistId: string;
  sessionTypeId: string;
  startDateTime: string;
  timezone: string;
  patientNotes?: string;
}

export async function createBooking(bookingData: CreateBookingData): Promise<Booking> {
  const { data } = await api.post('/marketplace/bookings', bookingData);
  return data;
}

export async function getBookings(status?: string): Promise<Booking[]> {
  const { data } = await api.get('/marketplace/bookings', { params: status ? { status } : {} });
  return data;
}

export async function getBooking(id: string): Promise<Booking> {
  const { data } = await api.get(`/marketplace/bookings/${id}`);
  return data;
}

export async function cancelBooking(id: string, reason?: string): Promise<void> {
  await api.post(`/marketplace/bookings/${id}/cancel`, { reason });
}

export async function completeBooking(id: string): Promise<void> {
  await api.post(`/marketplace/bookings/${id}/complete`);
}

export async function rateBooking(bookingId: string, rating: number, review?: string): Promise<SessionRating> {
  const { data } = await api.post(`/marketplace/ratings/${bookingId}`, { rating, review });
  return data;
}

export async function getTherapistRatings(therapistId: string, page = 1, limit = 10): Promise<{ ratings: SessionRating[]; total: number }> {
  const { data } = await api.get(`/marketplace/ratings/therapist/${therapistId}`, { params: { page, limit } });
  return data;
}
