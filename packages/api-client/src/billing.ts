import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface Invoice {
    id: string;
    sessionId: string;
    bookingId: string | null;
    patientId: string;
    therapistId: string;
    clinicName: string;
    amount: number | string;
    currency: string;
    status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
    stripePaymentId: string | null;
    issuedAt: string;
    dueDate: string | null;
    paidAt: string | null;
    notes: string | null;
    createdAt: string;

    session: {
        scheduledAt: string;
        sessionType: string | null;
        actualDuration: number | null;
    };
    therapist: {
        id: string;
        name: string | null;
        image: string | null;
    };
}

export interface ListInvoicesResponse {
    invoices: Invoice[];
    nextCursor: string | null;
    summary: {
        totalBilled: number;
        totalPaid: number;
        totalOutstanding: number;
    };
}

export async function getPatientInvoices(params?: {
    status?: string;
    limit?: number;
    cursor?: string;
}): Promise<ListInvoicesResponse> {
    const { data } = await apiClient.get('/invoices/my', { params });
    return data;
}

export function usePatientInvoices(params?: { status?: string; limit?: number }) {
    return useQuery({
        queryKey: ['patient-invoices', params],
        queryFn: () => getPatientInvoices(params),
    });
}

/**
 * Initiates a browser download for the given invoice PDF.
 */
export async function downloadInvoicePdf(invoiceId: string): Promise<void> {
    // Using fetch directly or opening in a new tab to handle PDF blobs
    // Since we have the token stored by the api client, it's easier to use the api instance with responseType blob
    const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;

    // Try to extract filename from response headers
    let fileName = `invoice-${invoiceId}.pdf`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
            fileName = filenameMatch[1];
        }
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
}
