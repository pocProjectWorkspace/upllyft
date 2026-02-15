import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  searchTherapists,
  getTherapistProfile,
  getMyTherapistProfile,
  createTherapistProfile,
  updateTherapistProfile,
  getTherapistSessionTypes,
  getMySessionTypes,
  createSessionType,
  updateSessionType,
  deleteSessionType,
  getSessionPricing,
  getMyPricing,
  updateSessionPricing,
  getAvailableSlots,
  getMyAvailability,
  setRecurringAvailability,
  addAvailabilityException,
  deleteAvailability,
  createBooking,
  getMyBookings,
  getBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  confirmSessionCompletion,
  rateSession,
  getTherapistRatings,
  getTherapistRatingStats,
  getStripeAccountStatus,
  createStripeOnboardingLink,
  getStripeDashboardLink,
  getTherapistAnalytics,
  type TherapistSearchFilters,
  type CreateBookingDto,
  type CreateTherapistProfileDto,
  type UpdateTherapistProfileDto,
  type CreateSessionTypeDto,
  type UpdateSessionTypeDto,
  type UpdateSessionPricingDto,
  type SetAvailabilityDto,
  type AddAvailabilityExceptionDto,
  type RejectBookingDto,
  type CancelBookingDto,
  type RescheduleBookingDto,
  type RateSessionDto,
  rescheduleBooking,
} from '@/lib/api/marketplace';

const keys = {
  all: ['marketplace'] as const,
  therapists: (filters?: TherapistSearchFilters) => [...keys.all, 'therapists', filters] as const,
  therapist: (id: string) => [...keys.all, 'therapist', id] as const,
  myProfile: () => [...keys.all, 'my-profile'] as const,
  sessionTypes: (therapistId: string) => [...keys.all, 'session-types', therapistId] as const,
  mySessionTypes: () => [...keys.all, 'my-session-types'] as const,
  pricing: (therapistId: string) => [...keys.all, 'pricing', therapistId] as const,
  myPricing: () => [...keys.all, 'my-pricing'] as const,
  availability: () => [...keys.all, 'my-availability'] as const,
  slots: (therapistId: string, date: string, sessionTypeId: string) =>
    [...keys.all, 'slots', therapistId, date, sessionTypeId] as const,
  bookings: (status?: string) => [...keys.all, 'bookings', status] as const,
  booking: (id: string) => [...keys.all, 'booking', id] as const,
  ratings: (therapistId: string, page: number) => [...keys.all, 'ratings', therapistId, page] as const,
  ratingStats: (therapistId: string) => [...keys.all, 'rating-stats', therapistId] as const,
  stripe: () => [...keys.all, 'stripe'] as const,
  analytics: () => [...keys.all, 'analytics'] as const,
};

// ── Therapist Search & Profiles ──

export function useSearchTherapists(filters?: TherapistSearchFilters) {
  return useQuery({
    queryKey: keys.therapists(filters),
    queryFn: () => searchTherapists(filters),
    staleTime: 30 * 1000,
  });
}

export function useTherapistProfile(therapistId: string) {
  return useQuery({
    queryKey: keys.therapist(therapistId),
    queryFn: () => getTherapistProfile(therapistId),
    enabled: !!therapistId,
  });
}

export function useMyTherapistProfile() {
  return useQuery({
    queryKey: keys.myProfile(),
    queryFn: getMyTherapistProfile,
    retry: false,
  });
}

export function useCreateTherapistProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTherapistProfileDto) => createTherapistProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myProfile() });
      toast({ title: 'Profile created', description: 'Your therapist profile is live.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create profile.', variant: 'destructive' });
    },
  });
}

export function useUpdateTherapistProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTherapistProfileDto) => updateTherapistProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myProfile() });
      toast({ title: 'Profile updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    },
  });
}

// ── Session Types & Pricing ──

export function useTherapistSessionTypes(therapistId: string) {
  return useQuery({
    queryKey: keys.sessionTypes(therapistId),
    queryFn: () => getTherapistSessionTypes(therapistId),
    enabled: !!therapistId,
  });
}

export function useMySessionTypes() {
  return useQuery({
    queryKey: keys.mySessionTypes(),
    queryFn: getMySessionTypes,
  });
}

export function useCreateSessionType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionTypeDto) => createSessionType(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mySessionTypes() });
      toast({ title: 'Session type created' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create session type.', variant: 'destructive' });
    },
  });
}

export function useUpdateSessionType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSessionTypeDto }) => updateSessionType(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mySessionTypes() });
      toast({ title: 'Session type updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update session type.', variant: 'destructive' });
    },
  });
}

export function useDeleteSessionType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSessionType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mySessionTypes() });
      toast({ title: 'Session type deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete session type.', variant: 'destructive' });
    },
  });
}

export function useSessionPricing(therapistId: string) {
  return useQuery({
    queryKey: keys.pricing(therapistId),
    queryFn: () => getSessionPricing(therapistId),
    enabled: !!therapistId,
  });
}

export function useMyPricing() {
  return useQuery({
    queryKey: keys.myPricing(),
    queryFn: getMyPricing,
  });
}

export function useUpdateSessionPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSessionPricingDto) => updateSessionPricing(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myPricing() });
      qc.invalidateQueries({ queryKey: keys.mySessionTypes() });
      toast({ title: 'Pricing updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update pricing.', variant: 'destructive' });
    },
  });
}

// ── Availability ──

export function useMyAvailability() {
  return useQuery({
    queryKey: keys.availability(),
    queryFn: getMyAvailability,
  });
}

export function useSetRecurringAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SetAvailabilityDto) => setRecurringAvailability(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.availability() });
      toast({ title: 'Availability set' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to set availability.', variant: 'destructive' });
    },
  });
}

export function useAddAvailabilityException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddAvailabilityExceptionDto) => addAvailabilityException(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.availability() });
      toast({ title: 'Exception added' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add exception.', variant: 'destructive' });
    },
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAvailability(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.availability() });
      toast({ title: 'Availability slot removed' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove slot.', variant: 'destructive' });
    },
  });
}

// ── Available Slots (for booking) ──

export function useAvailableSlots(
  therapistId: string,
  date: string,
  sessionTypeId: string,
  timezone: string,
) {
  return useQuery({
    queryKey: keys.slots(therapistId, date, sessionTypeId),
    queryFn: () => getAvailableSlots(therapistId, { date, sessionTypeId, timezone }),
    enabled: !!therapistId && !!date && !!sessionTypeId,
    staleTime: 30 * 1000,
  });
}

// ── Bookings ──

export function useMyBookings(status?: string) {
  return useQuery({
    queryKey: keys.bookings(status),
    queryFn: () => getMyBookings(status),
  });
}

export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: keys.booking(bookingId),
    queryFn: () => getBooking(bookingId),
    enabled: !!bookingId,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingDto) => createBooking(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.bookings() });
      toast({ title: 'Session booked', description: 'Your booking request has been sent.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create booking.', variant: 'destructive' });
    },
  });
}

export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => acceptBooking(bookingId),
    onSuccess: (_data, bookingId) => {
      qc.invalidateQueries({ queryKey: keys.booking(bookingId) });
      qc.invalidateQueries({ queryKey: keys.bookings() });
      toast({ title: 'Booking accepted', description: 'A calendar invite has been sent.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to accept booking.', variant: 'destructive' });
    },
  });
}

export function useRejectBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectBookingDto }) => rejectBooking(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.booking(variables.id) });
      qc.invalidateQueries({ queryKey: keys.bookings() });
      toast({ title: 'Booking rejected' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reject booking.', variant: 'destructive' });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: CancelBookingDto }) => cancelBooking(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.booking(variables.id) });
      qc.invalidateQueries({ queryKey: keys.bookings() });
      toast({ title: 'Booking cancelled' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to cancel booking.', variant: 'destructive' });
    },
  });
}

export function useConfirmCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => confirmSessionCompletion(bookingId),
    onSuccess: (_data, bookingId) => {
      qc.invalidateQueries({ queryKey: keys.booking(bookingId) });
      qc.invalidateQueries({ queryKey: keys.bookings() });
      toast({ title: 'Session completed' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to confirm completion.', variant: 'destructive' });
    },
  });
}

export function useRescheduleBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RescheduleBookingDto }) => rescheduleBooking(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.booking(variables.id) });
      qc.invalidateQueries({ queryKey: keys.bookings() });
      toast({ title: 'Booking rescheduled', description: 'The new date and time have been confirmed.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reschedule booking.', variant: 'destructive' });
    },
  });
}

// ── Ratings ──

export function useRateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: string; data: RateSessionDto }) =>
      rateSession(bookingId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.booking(variables.bookingId) });
      toast({ title: 'Rating submitted', description: 'Thank you for your feedback.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit rating.', variant: 'destructive' });
    },
  });
}

export function useTherapistRatings(therapistId: string, page = 1) {
  return useQuery({
    queryKey: keys.ratings(therapistId, page),
    queryFn: () => getTherapistRatings(therapistId, page),
    enabled: !!therapistId,
  });
}

export function useTherapistRatingStats(therapistId: string) {
  return useQuery({
    queryKey: keys.ratingStats(therapistId),
    queryFn: () => getTherapistRatingStats(therapistId),
    enabled: !!therapistId,
  });
}

// ── Stripe ──

export function useStripeAccountStatus() {
  return useQuery({
    queryKey: keys.stripe(),
    queryFn: getStripeAccountStatus,
  });
}

export function useCreateStripeOnboarding() {
  return useMutation({
    mutationFn: createStripeOnboardingLink,
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to start Stripe onboarding.', variant: 'destructive' });
    },
  });
}

export function useStripeDashboardLink() {
  return useMutation({
    mutationFn: getStripeDashboardLink,
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to open Stripe dashboard.', variant: 'destructive' });
    },
  });
}

// ── Analytics ──

export function useTherapistAnalytics() {
  return useQuery({
    queryKey: keys.analytics(),
    queryFn: getTherapistAnalytics,
    staleTime: 5 * 60 * 1000,
  });
}
