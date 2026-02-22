import { apiClient } from '@upllyft/api-client';

// ── Enums ──

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

// ── Types ──

export interface Invoice {
  id: string;
  sessionId: string;
  bookingId?: string | null;
  patientId: string;
  therapistId: string;
  amount: string; // Decimal comes as string
  currency: string;
  status: InvoiceStatus;
  clinicName?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  session: {
    scheduledAt: string;
    sessionType?: string | null;
    actualDuration?: number | null;
  };
  therapist: {
    id: string;
    name: string;
    image?: string | null;
  };
  patient?: {
    id: string;
    name: string;
  };
}

export interface InvoiceSummary {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  nextCursor: string | null;
  summary: InvoiceSummary;
}

// ── API Functions ──

export async function getMyInvoices(params?: {
  status?: InvoiceStatus;
  cursor?: string;
  limit?: number;
}): Promise<InvoicesResponse> {
  const { data } = await apiClient.get('/api/invoices/my', { params });
  return data;
}

export async function getSessionInvoice(sessionId: string): Promise<Invoice> {
  const { data } = await apiClient.get(`/api/invoices/session/${sessionId}`);
  return data;
}

export async function downloadInvoicePdf(invoiceId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/api/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  });
  return data;
}
