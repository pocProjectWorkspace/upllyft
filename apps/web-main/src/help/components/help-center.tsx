'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@upllyft/api-client';
import { useMiraOpen } from '@/components/mira/mira-context';
import { AUDIENCE_LABELS, FaqAnswer, plainAnswer, type FaqAudience, type PublicFaqCategory } from '@/help/lib/faq';

type Tab = 'ALL' | Exclude<FaqAudience, 'ALL'>;

const TABS: Tab[] = ['ALL', 'PARENT', 'THERAPIST', 'FACILITY'];

/** Which tab a signed-in user starts on. */
function tabForRole(role?: string): Tab {
  if (role === 'THERAPIST' || role === 'EDUCATOR') return 'THERAPIST';
  if (role === 'ORGANIZATION') return 'FACILITY';
  if (role === 'USER') return 'PARENT';
  return 'ALL';
}

/**
 * Help Center body: audience tabs, search, and categories of expandable questions.
 * Each question has an id (its slug), so /help#directory-listing scrolls to and opens it.
 */
export function HelpCenter({ categories }: { categories: PublicFaqCategory[] }) {
  const { user } = useAuth();
  const { open: openMira } = useMiraOpen();
  const [tab, setTab] = useState<Tab | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const activeTab = tab ?? tabForRole(user?.role);

  // Deep link: open the question named in the hash and bring it into view.
  useEffect(() => {
    const openHash = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      if (!slug) return;
      setTab('ALL');
      setQuery('');
      setOpen((prev) => new Set(prev).add(slug));
      requestAnimationFrame(() => document.getElementById(slug)?.scrollIntoView({ block: 'center' }));
    };
    openHash();
    window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => activeTab === 'ALL' || c.audience === activeTab || c.audience === 'ALL')
      .map((c) => ({
        ...c,
        // A query that names the category ("privacy", "screening") keeps all of its questions.
        items:
          q && !c.name.toLowerCase().includes(q)
            ? c.items.filter((i) => `${i.question} ${plainAnswer(i.answer)}`.toLowerCase().includes(q))
            : c.items,
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, activeTab, query]);

  const searching = query.trim().length > 0;

  const toggle = (slug: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return (
    <div className="space-y-6">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, e.g. screening, booking, privacy"
          aria-label="Search the Help Center"
          className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-[15px] shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Who is this for">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={activeTab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              activeTab === t
                ? 'bg-teal-600 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-teal-300'
            }`}
          >
            {t === 'ALL' ? 'All topics' : AUDIENCE_LABELS[t]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <p className="font-medium text-gray-700">{searching ? `No answers match "${query.trim()}"` : 'No questions here yet'}</p>
          <p className="mt-1 text-sm text-gray-500">Try another word, or contact us below.</p>
        </div>
      ) : (
        visible.map((category) => (
          <section key={category.slug} aria-labelledby={`cat-${category.slug}`}>
            <h2 id={`cat-${category.slug}`} className="mb-3 text-lg font-bold text-gray-900">
              {category.name}
            </h2>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              {category.items.map((item) => {
                const isOpen = searching || open.has(item.slug);
                return (
                  <div key={item.slug} id={item.slug} className="scroll-mt-24">
                    <button
                      type="button"
                      onClick={() => toggle(item.slug)}
                      aria-expanded={isOpen}
                      aria-controls={`${item.slug}-answer`}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50"
                    >
                      <span className="text-[15px] font-semibold text-gray-900">{item.question}</span>
                      <svg
                        className={`h-5 w-5 flex-none text-teal-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div id={`${item.slug}-answer`} className="px-5 pb-5 text-[14.5px] leading-relaxed text-gray-600">
                        <FaqAnswer text={item.answer} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <div className="rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 p-6 text-white shadow-sm">
        <h2 className="text-lg font-bold">Still need help?</h2>
        <p className="mt-1 text-sm text-teal-50">
          {user?.role === 'USER'
            ? 'Ask Mira, or get in touch with our team and we will get back to you.'
            : 'Get in touch with our team and we will get back to you.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {user?.role === 'USER' && (
            <button
              type="button"
              onClick={() => openMira()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Ask Mira
            </button>
          )}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-xl border border-white/60 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Email {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}

const SUPPORT_EMAIL = 'support@upllyft.com';
