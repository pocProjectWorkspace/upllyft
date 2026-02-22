import type { BookingStatus } from './api/marketplace';
import type { InvoiceStatus } from './api/invoices';

export const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  PENDING_ACCEPTANCE: 'Pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
};

export const bookingStatusColors: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'yellow',
  PENDING_ACCEPTANCE: 'blue',
  CONFIRMED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
  COMPLETED: 'green',
  NO_SHOW: 'red',
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  PAID: 'Paid',
  VOID: 'Void',
};

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'yellow',
  ISSUED: 'blue',
  PAID: 'green',
  VOID: 'gray',
};

export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isUpcoming(date: string | Date): boolean {
  return new Date(date) > new Date();
}

export function isPast(date: string | Date): boolean {
  return new Date(date) < new Date();
}

export function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}
