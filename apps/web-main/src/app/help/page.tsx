import type { Metadata } from 'next';
import { HelpCenter } from '@/help/components/help-center';
import { plainAnswer, type PublicFaqCategory } from '@/help/lib/faq';

export const metadata: Metadata = {
  title: 'Help Center | Upllyft',
  description:
    'Answers for parents, therapists and clinics: getting started, Mira, screening, finding care, privacy and your account.',
  alternates: { canonical: '/help' },
};

const API_ORIGIN = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Public Help Center (no session needed; not in proxy.ts PROTECTED_PREFIXES). The FAQ
 * is fetched on the server so it is in the HTML for search engines, and cached for five
 * minutes, so an edit in /admin/faq shows up here within that window. A failed fetch
 * renders the page with only the contact card rather than an error.
 */
async function loadFaq(): Promise<PublicFaqCategory[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/faq`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return (await res.json()) as PublicFaqCategory[];
  } catch {
    return [];
  }
}

export default async function HelpPage() {
  const categories = await loadFaq();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: categories.flatMap((c) =>
      c.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: plainAnswer(item.answer) },
      })),
    ),
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-b from-teal-50 to-gray-50">
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-12 text-center sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">How can we help?</h1>
          <p className="mt-3 text-gray-600">
            Answers for parents, therapists, clinics and nurseries using Upllyft.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <HelpCenter categories={categories} />
      </div>
      {jsonLd.mainEntity.length > 0 && (
        <script
          type="application/ld+json"
          // JSON.stringify output with "<" escaped so answer text cannot close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </main>
  );
}
