'use client';

import { Card } from '@upllyft/ui';
import { Download, FileText, Calendar, User, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { type Invoice, downloadInvoicePdf } from '@upllyft/api-client';
import { useState } from 'react';

interface InvoiceCardProps {
    invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setDownloading(true);
            await downloadInvoicePdf(invoice.id);
        } catch (err) {
            console.error('Failed to download invoice:', err);
            alert('Failed to download the invoice. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const formattedDate = new Date(invoice.issuedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const sessionDate = invoice.session?.scheduledAt
        ? new Date(invoice.session.scheduledAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
        : null;

    const StatusBadge = () => {
        switch (invoice.status) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Paid
                    </span>
                );
            case 'ISSUED':
            case 'DRAFT':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3.5 h-3.5" />
                        Generated
                    </span>
                );
            case 'VOID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 text-gray-700 border border-gray-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Void
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-12 w-12 rounded-xl bg-teal-50 items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-teal-600" />
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">
                            {invoice.currency} {invoice.amount}
                        </h3>
                        <StatusBadge />
                    </div>

                    <div className="text-sm text-gray-500 mb-2">
                        Invoice #{invoice.id.slice(-8).toUpperCase()} • Issued {formattedDate}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                        {sessionDate && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                Session on {sessionDate}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {invoice.therapist?.name || 'Therapist'}
                        </div>
                        {invoice.session?.sessionType && (
                            <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-md">
                                {invoice.session.sessionType}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-3 mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100">
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors disabled:opacity-50"
                >
                    {downloading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    Download PDF
                </button>
            </div>
        </Card>
    );
}
