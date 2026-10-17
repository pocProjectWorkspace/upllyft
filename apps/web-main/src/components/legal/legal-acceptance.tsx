'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth } from '@upllyft/api-client';

// Legal acceptance (Legal Pack v1.1): the Terms, Privacy and 18+ boxes on sign-up,
// and a blocking prompt for anyone who hasn't accepted the current versions
// (existing accounts, Google sign-ups, and everyone after a version bump).

export type LegalDocumentType = 'TERMS' | 'PRIVACY' | 'AGE_18_PLUS';

export interface LegalDocument {
  type: LegalDocumentType;
  version: string;
  edition: string;
  title: string;
  statement: string;
  url: string | null;
}

export const legalKeys = {
  documents: ['legal', 'documents'] as const,
  status: ['legal', 'status'] as const,
};

/** Current documents and their checkbox wording (public). */
export function useLegalDocuments() {
  return useQuery({
    queryKey: legalKeys.documents,
    queryFn: async () => (await apiClient.get<{ documents: LegalDocument[] }>('/legal/documents')).data.documents,
    staleTime: 60 * 60 * 1000,
  });
}

/** Unticked checkboxes, one per document; the statement links to the full text. */
export function LegalCheckboxes({
  documents,
  checked,
  onChange,
}: {
  documents: LegalDocument[];
  checked: Partial<Record<LegalDocumentType, boolean>>;
  onChange: (type: LegalDocumentType, value: boolean) => void;
}) {
  return (
    <div className="space-y-2.5">
      {documents.map((d) => (
        <label key={d.type} className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={!!checked[d.type]}
            onChange={(e) => onChange(d.type, e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span>
            {d.statement}
            {d.url && (
              <>
                {' '}
                <Link href={d.url} target="_blank" rel="noopener" className="text-teal-700 underline hover:text-teal-800">
                  Read the {d.title}
                </Link>
              </>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

// Pages that must stay reachable without accepting: the documents themselves and
// the auth screens.
const EXEMPT_PREFIXES = [
  '/terms-of-service',
  '/privacy-policy',
  '/login',
  '/register',
  '/callback',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
  '/claim',
];

/**
 * Blocks the app with an acceptance prompt while the signed-in user has any current
 * document they haven't accepted. Mounted once in AppFrame.
 */
export function LegalAcceptanceGate() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname() || '/';
  const exempt = EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: legalKeys.status,
    queryFn: async () => (await apiClient.get<{ pending: LegalDocument[] }>('/legal/status')).data.pending,
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000,
    // A failed check must never lock people out; it is asked again later.
    retry: 1,
  });
  const [checked, setChecked] = useState<Partial<Record<LegalDocumentType, boolean>>>({});
  const [error, setError] = useState('');

  const accept = useMutation({
    mutationFn: async (docs: LegalDocument[]) =>
      (
        await apiClient.post<{ pending: LegalDocument[] }>('/legal/accept', {
          accepted: docs.map((d) => ({ type: d.type, version: d.version })),
        })
      ).data,
    onSuccess: (res) => {
      setError('');
      qc.setQueryData(legalKeys.status, res.pending);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Couldn’t save. Please try again.');
      // A newer version may have been published while the prompt was open.
      qc.invalidateQueries({ queryKey: legalKeys.status });
    },
  });

  const pending = status.data ?? [];
  if (!isAuthenticated || exempt || pending.length === 0) return null;

  const allChecked = pending.every((d) => checked[d.type]);
  const updated = pending.some((d) => d.type !== 'AGE_18_PLUS');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="legal-gate-title" className="text-lg font-semibold text-gray-900">
          {updated ? 'Please review our terms' : 'One more thing'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          To keep using Upllyft, please confirm the following. You can read each document before agreeing.
        </p>
        <div className="mt-5">
          <LegalCheckboxes
            documents={pending}
            checked={checked}
            onChange={(type, value) => setChecked((c) => ({ ...c, [type]: value }))}
          />
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
          <button
            type="button"
            disabled={!allChecked || accept.isPending}
            onClick={() => accept.mutate(pending)}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {accept.isPending ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
