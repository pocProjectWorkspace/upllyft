'use client';

import Link from 'next/link';
import Markdown from 'react-markdown';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { LegalDocumentView } from '@/components/legal/legal-document-view';
import type { LegalDocument } from '@/lib/legal-content';

export interface PublishedLegalDocument {
  type: string;
  edition: string;
  title: string;
  version: string;
  acceptanceVersion: string;
  content: string;
  publishedAt: string | null;
  url: string;
}

/** Markdown → the same look the hard-coded legal pages had. Raw HTML is never rendered. */
export function LegalMarkdown({ content }: { content: string }) {
  return (
    <Markdown
      components={{
        h1: ({ children }) => <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">{children}</h2>,
        h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mt-8 mb-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mt-6 mb-2">{children}</h3>,
        p: ({ children }) => <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 mb-3 text-sm text-gray-600">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 mb-3 text-sm text-gray-600">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} className="text-teal-700 underline hover:text-teal-800" target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
            {children}
          </a>
        ),
        hr: () => <hr className="my-6 border-gray-200" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-gray-600 border border-gray-200">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-3 py-2 align-top">{children}</td>,
      }}
    >
      {content}
    </Markdown>
  );
}

export function formatLegalDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * A public legal page. The text comes from the admin-managed, versioned documents
 * (/admin/legal), so publishing a new version changes this page with no deploy.
 *
 * `fallback` is the built-in text (lib/legal-content.ts, the same text the database was
 * seeded with). It is shown if the API can't be reached, so Terms and Privacy never go
 * blank; a specific past `version` has no fallback.
 */
export function LegalDocumentPage({
  slug,
  version,
  fallback,
}: {
  slug: string;
  version?: string;
  fallback?: LegalDocument;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['legal-document', slug, version ?? 'current'],
    queryFn: async () =>
      (await apiClient.get<PublishedLegalDocument>(
        version ? `/legal/documents/${slug}/versions/${encodeURIComponent(version)}` : `/legal/documents/${slug}`,
      )).data,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (isError && fallback && !version) return <LegalDocumentView document={fallback} />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-7 w-64 rounded bg-gray-200" />
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-96 rounded-2xl bg-white border border-gray-200" />
          </div>
        ) : isError || !data ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h1 className="text-lg font-semibold text-gray-900">This document isn’t available right now</h1>
            <p className="text-sm text-gray-500 mt-2">Please try again in a moment, or contact support@upllyft.com.</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{data.title}</h1>
              <p className="text-sm text-gray-500">
                {version ? `Version ${data.version} · ` : ''}Last updated: {formatLegalDate(data.publishedAt) ?? data.version}
              </p>
              {version && (
                <p className="text-sm mt-2">
                  <Link href={data.url} className="text-teal-700 underline">
                    Read the current version
                  </Link>
                </p>
              )}
            </div>
            <article className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
              <LegalMarkdown content={data.content} />
            </article>
          </>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </main>
    </div>
  );
}
