import { apiClient } from '@upllyft/api-client';

// ── Enums ──

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_ACCEPTANCE'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type TherapistApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AccessLevel = 'VIEW' | 'ANNOTATE';

// ── Types ──

export interface TherapistProfile {
  id: string;
  userId: string;
  bio: string;
  credentials: string[];
  specializations: string[];
  yearsExperience: number;
  title: string;
  profileImage?: string;
  languages: string[];
  defaultTimezone: string;
  overallRating: number;
  totalSessions: number;
  totalRatings: number;
  stripeAccountId?: string;
  isActive: boolean;
  acceptingBookings: boolean;
  user?: { id: string; name: string; email: string; image?: string };
}

export interface SessionType {
  id: string;
  therapistId: string;
  name: string;
  description?: string;
  duration: number;
  isActive: boolean;
}

export interface SessionPricing {
  id: string;
  therapistId: string;
  sessionTypeId: string;
  price: number;
  currency: string;
  organizationId?: string;
  sessionType?: SessionType;
}

export interface TherapistAvailability {
  id: string;
  therapistId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
}

export interface AvailabilityException {
  id: string;
  therapistId: string;
  date: string;
  type: 'UNAVAILABLE' | 'AVAILABLE';
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface Booking {
  id: string;
  patientId: string;
  therapistId: string;
  sessionTypeId: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  status: BookingStatus;
  patientNotes?: string;
  patientFiles?: string[];
  meetLink?: string;
  calendarEventId?: string;
  sessionPrice: number;
  platformFee: number;
  therapistPayout: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  completedAt?: string;
  acceptanceDeadline?: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; name: string; email: string; image?: string };
  therapist?: TherapistProfile;
  sessionType?: SessionType;
  ratings?: SessionRating[];
}

export interface SessionRating {
  id: string;
  bookingId: string;
  userId: string;
  therapistId: string;
  rating: number;
  review?: string;
  isAnonymous: boolean;
  categories?: {
    professionalism?: number;
    communication?: number;
    helpfulness?: number;
    engagement?: number;
    punctuality?: number;
  };
  wouldRecommend?: boolean;
  createdAt: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface TherapistSearchResult {
  therapists: TherapistProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TherapistSearchFilters {
  search?: string;
  specialization?: string;
  language?: string;
  minRating?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface TherapistAnalytics {
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  pendingRequests: number;
  upcomingSessions: number;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  distribution: Record<string, number>;
  categories?: Record<string, number>;
  recommendationRate?: number;
}

export interface StripeAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

// ── DTOs ──

export interface CreateBookingDto {
  therapistId: string;
  sessionTypeId: string;
  startDateTime: string;
  timezone: string;
  patientNotes?: string;
  patientFiles?: string[];
}

export interface RejectBookingDto {
  reason: string;
}

export interface CancelBookingDto {
  reason?: string;
}

export interface RateSessionDto {
  rating: number;
  reviewText?: string;
  categories?: {
    professionalism?: number;
    communication?: number;
    helpfulness?: number;
    engagement?: number;
    punctuality?: number;
  };
  wouldRecommend?: boolean;
  isAnonymous?: boolean;
}

export interface SetAvailabilityDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface AddAvailabilityExceptionDto {
  date: string;
  type: 'AVAILABLE' | 'BLOCKED';
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface CreateTherapistProfileDto {
  bio: string;
  title: string;
  credentials: string[];
  specializations: string[];
  yearsExperience: number;
  languages: string[];
  defaultTimezone: string;
}

export interface UpdateTherapistProfileDto {
  bio?: string;
  title?: string;
  credentials?: string[];
  specializations?: string[];
  yearsExperience?: number;
  languages?: string[];
  defaultTimezone?: string;
  profileImage?: string;
  acceptingBookings?: boolean;
}

export interface CreateSessionTypeDto {
  name: string;
  description?: string;
  duration: number;
}

export interface UpdateSessionTypeDto {
  name?: string;
  description?: string;
  duration?: number;
  isActive?: boolean;
}

export interface UpdateSessionPricingDto {
  sessionTypeId: string;
  price: number;
  currency?: string;
}

// ── API Functions ──

// Therapist Search & Profiles
export async function searchTherapists(filters?: TherapistSearchFilters): Promise<TherapistSearchResult> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.specialization) params.specialization = filters.specialization;
  if (filters?.language) params.language = filters.language;
  if (filters?.minRating) params.minRating = String(filters.minRating);
  if (filters?.maxPrice) params.maxPrice = String(filters.maxPrice);
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);
  const res = await apiClient.get('/marketplace/therapists', { params });
  return res.data;
}

export async function getTherapistProfile(therapistId: string): Promise<TherapistProfile> {
  const res = await apiClient.get(`/marketplace/therapists/${therapistId}`);
  return res.data;
}

export async function getMyTherapistProfile(): Promise<TherapistProfile> {
  const res = await apiClient.get('/marketplace/therapists/me/profile');
  return res.data;
}

export async function createTherapistProfile(data: CreateTherapistProfileDto): Promise<TherapistProfile> {
  const res = await apiClient.post('/marketplace/therapists/me/profile', data);
  return res.data;
}

export async function updateTherapistProfile(data: UpdateTherapistProfileDto): Promise<TherapistProfile> {
  const res = await apiClient.patch('/marketplace/therapists/me/profile', data);
  return res.data;
}

// Session Types & Pricing
export async function getTherapistSessionTypes(therapistId: string): Promise<SessionType[]> {
  const res = await apiClient.get(`/marketplace/therapists/${therapistId}/session-types`);
  return res.data;
}

export async function getMySessionTypes(): Promise<SessionType[]> {
  const res = await apiClient.get('/marketplace/therapists/me/session-types');
  return res.data;
}

export async function createSessionType(data: CreateSessionTypeDto): Promise<SessionType> {
  const res = await apiClient.post('/marketplace/therapists/me/session-types', data);
  return res.data;
}

export async function updateSessionType(sessionTypeId: string, data: UpdateSessionTypeDto): Promise<SessionType> {
  const res = await apiClient.patch(`/marketplace/therapists/me/session-types/${sessionTypeId}`, data);
  return res.data;
}

export async function deleteSessionType(sessionTypeId: string): Promise<void> {
  await apiClient.delete(`/marketplace/therapists/me/session-types/${sessionTypeId}`);
}

export async function getSessionPricing(therapistId: string): Promise<SessionPricing[]> {
  const res = await apiClient.get(`/marketplace/therapists/${therapistId}/pricing`);
  return res.data;
}

export async function getMyPricing(): Promise<SessionPricing[]> {
  const res = await apiClient.get('/marketplace/therapists/me/pricing');
  return res.data;
}

export async function updateSessionPricing(data: UpdateSessionPricingDto): Promise<SessionPricing> {
  const res = await apiClient.post('/marketplace/therapists/me/pricing', data);
  return res.data;
}

// Availability
export async function getAvailableSlots(
  therapistId: string,
  params: { date: string; sessionTypeId: string; timezone: string },
): Promise<AvailableSlot[]> {
  const res = await apiClient.get(`/marketplace/therapists/${therapistId}/slots`, { params });
  return res.data;
}

export async function getTherapistAvailability(therapistId: string): Promise<{
  recurring: TherapistAvailability[];
  exceptions: AvailabilityException[];
}> {
  const res = await apiClient.get(`/marketplace/therapists/${therapistId}/availability`);
  return res.data;
}

export async function getMyAvailability(): Promise<{
  recurring: TherapistAvailability[];
  exceptions: AvailabilityException[];
}> {
  const res = await apiClient.get('/marketplace/therapists/me/availability');
  return res.data;
}

export async function setRecurringAvailability(data: SetAvailabilityDto): Promise<TherapistAvailability> {
  const res = await apiClient.post('/marketplace/therapists/me/availability', data);
  return res.data;
}

export async function addAvailabilityException(data: AddAvailabilityExceptionDto): Promise<AvailabilityException> {
  const res = await apiClient.post('/marketplace/therapists/me/availability/exceptions', data);
  return res.data;
}

export async function deleteAvailability(availabilityId: string): Promise<void> {
  await apiClient.delete(`/marketplace/therapists/me/availability/${availabilityId}`);
}

export async function deleteAvailabilityException(exceptionId: string): Promise<void> {
  await apiClient.delete(`/marketplace/therapists/me/availability/exceptions/${exceptionId}`);
}

// Bookings
export async function createBooking(data: CreateBookingDto): Promise<Booking> {
  const res = await apiClient.post('/marketplace/bookings', data);
  return res.data;
}

export async function getMyBookings(status?: string): Promise<Booking[]> {
  const params = status ? { status } : {};
  const res = await apiClient.get('/marketplace/bookings', { params });
  return res.data;
}

export async function getBooking(bookingId: string): Promise<Booking> {
  const res = await apiClient.get(`/marketplace/bookings/${bookingId}`);
  return res.data;
}

export async function acceptBooking(bookingId: string): Promise<Booking> {
  const res = await apiClient.post(`/marketplace/bookings/${bookingId}/accept`);
  return res.data;
}

export async function rejectBooking(bookingId: string, data: RejectBookingDto): Promise<Booking> {
  const res = await apiClient.post(`/marketplace/bookings/${bookingId}/reject`, data);
  return res.data;
}

export async function cancelBooking(bookingId: string, data?: CancelBookingDto): Promise<Booking> {
  const res = await apiClient.post(`/marketplace/bookings/${bookingId}/cancel`, data);
  return res.data;
}

export async function confirmSessionCompletion(bookingId: string): Promise<Booking> {
  const res = await apiClient.post(`/marketplace/bookings/${bookingId}/complete`);
  return res.data;
}

// Ratings
export async function rateSession(bookingId: string, data: RateSessionDto): Promise<SessionRating> {
  const res = await apiClient.post(`/marketplace/ratings/${bookingId}`, data);
  return res.data;
}

export async function getTherapistRatings(
  therapistId: string,
  page = 1,
  limit = 10,
): Promise<{ ratings: SessionRating[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const res = await apiClient.get(`/marketplace/ratings/therapist/${therapistId}`, { params: { page, limit } });
  return res.data;
}

export async function getTherapistRatingStats(therapistId: string): Promise<RatingStats> {
  const res = await apiClient.get(`/marketplace/ratings/therapist/${therapistId}/stats`);
  return res.data;
}

// Payments (Stripe Connect)
export async function getStripeAccountStatus(): Promise<StripeAccountStatus> {
  try {
    const res = await apiClient.get('/marketplace/payments/stripe/status');
    return res.data;
  } catch {
    return { hasAccount: false };
  }
}

export async function createStripeOnboardingLink(): Promise<{ url: string }> {
  const res = await apiClient.post('/marketplace/payments/stripe/onboarding');
  return res.data;
}

export async function getStripeDashboardLink(): Promise<{ url: string }> {
  const res = await apiClient.get('/marketplace/payments/stripe/dashboard');
  return res.data;
}

// Analytics
export async function getTherapistAnalytics(): Promise<TherapistAnalytics> {
  const res = await apiClient.get('/marketplace/therapists/me/analytics');
  return res.data;
}
