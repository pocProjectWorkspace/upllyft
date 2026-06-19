import { apiClient } from '@upllyft/api-client';

export type FinancialClearanceStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'CLEARED'
  | 'EXCEPTION_APPROVED'
  | 'BLOCKED';

export interface BookingReadiness {
  bookingId: string;
  ready: boolean;
  financialClearance: FinancialClearanceStatus;
  paymentRoute: string;
  paymentStatus: string;
  blockers: string[];
}

export async function getBookingReadiness(bookingId: string): Promise<BookingReadiness> {
  const res = await apiClient.get(`/bookings/${bookingId}/readiness`);
  return res.data;
}

export async function setBookingClearance(
  bookingId: string,
  data: { status: FinancialClearanceStatus; note?: string },
) {
  const res = await apiClient.patch(`/bookings/${bookingId}/clearance`, data);
  return res.data;
}
