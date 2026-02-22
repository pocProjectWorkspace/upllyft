'use client';

import { useState, useEffect } from 'react';
import {
  getPatientConsents,
  sendConsentForm,
  type ConsentForm,
  type SendConsentPayload,
} from '@/lib/api/consent';
import { FileText, Send, X, AlertCircle } from 'lucide-react';

interface ConsentPanelProps {
  patientId: string; // parent's User.id
  childName: string;
  parentName: string;
  parentEmail: string;
  intakeId: string;
}

const STATUS_CONFIG: Record<
  ConsentForm['status'],
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  SENT: {
    label: 'Awaiting signature',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  SIGNED: {
    label: 'Signed',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  DECLINED: {
    label: 'Declined',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ConsentPanel({
  patientId,
  childName,
  parentName,
  parentEmail,
  intakeId,
}: ConsentPanelProps) {
  const [consents, setConsents] = useState<ConsentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConsents = async () => {
    try {
      const data = await getPatientConsents(patientId);
      setConsents(data);
    } catch {
      setConsents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchConsents();
  }, [patientId]);

  const handleSend = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: SendConsentPayload = {
        patientId,
        intakeId,
        patientName: childName,
        parentName,
        parentEmail,
      };
      await sendConsentForm(payload);
      setModalOpen(false);
      await fetchConsents();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to send consent form. Please check your DocuSign configuration.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const latest = consents[0];
  const showSendButton =
    !latest || latest.status === 'DECLINED' || latest.status === 'EXPIRED';
  const showResendButton = latest?.status === 'SENT';

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900">
            Consent Form
          </h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">
              Consent Form
            </h3>
          </div>
          {(showSendButton || showResendButton) && (
            <button
              onClick={() => {
                setError(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              <Send className="w-3.5 h-3.5" />
              {showResendButton ? 'Resend' : 'Send Consent Form'}
            </button>
          )}
        </div>

        {consents.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              No consent form sent
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {consents.map((consent) => {
              const config = STATUS_CONFIG[consent.status];
              return (
                <div
                  key={consent.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
                    >
                      {consent.status === 'SIGNED' && (
                        <span className="mr-1">&#10003;</span>
                      )}
                      {config.label}
                    </span>
                    <span className="text-sm text-gray-500">
                      {consent.status === 'SIGNED'
                        ? `Signed ${formatDate(consent.signedAt)}`
                        : consent.status === 'SENT'
                          ? `Sent ${formatDate(consent.sentAt)}`
                          : `Created ${formatDate(consent.createdAt)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send Consent Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Send Consent Form
              </h3>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Child
                </p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {childName}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Parent / Guardian
                </p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {parentName}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Email
                </p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {parentEmail}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              The parent will receive a signing link in their Upllyft
              account.
            </p>

            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
