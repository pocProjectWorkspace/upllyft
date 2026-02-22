import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  getMyInvoices,
  downloadInvoicePdf,
  type InvoiceStatus,
} from '@/lib/api/invoices';

const keys = {
  all: ['invoices'] as const,
  list: (status?: InvoiceStatus) => [...keys.all, 'list', status] as const,
};

export function useMyInvoices(status?: InvoiceStatus) {
  return useQuery({
    queryKey: keys.list(status),
    queryFn: () => getMyInvoices(status ? { status } : undefined),
  });
}

export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const blob = await downloadInvoicePdf(invoiceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: 'Invoice downloaded' });
    },
    onError: () => {
      toast({ title: 'Failed to download invoice', variant: 'destructive' });
    },
  });
}
