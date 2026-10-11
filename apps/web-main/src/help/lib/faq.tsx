import { Fragment, type ReactNode } from 'react';

export type FaqAudience = 'PARENT' | 'THERAPIST' | 'FACILITY' | 'ALL';

export const AUDIENCE_LABELS: Record<FaqAudience, string> = {
  PARENT: 'Parents',
  THERAPIST: 'Therapists',
  FACILITY: 'Clinics & nurseries',
  ALL: 'Everyone',
};

/** GET /faq: published items only, grouped by category. */
export interface PublicFaqCategory {
  slug: string;
  name: string;
  audience: FaqAudience;
  items: Array<{ slug: string; question: string; answer: string }>;
}

/** GET /admin/faq: everything, including drafts. */
export interface AdminFaqItem {
  id: string;
  slug: string;
  categoryId: string;
  question: string;
  answer: string;
  published: boolean;
  sortOrder: number;
}

export interface AdminFaqCategory {
  id: string;
  slug: string;
  name: string;
  audience: FaqAudience;
  sortOrder: number;
  items: AdminFaqItem[];
}

/** Help Center deep link, e.g. helpHref('booking-coming-soon'). */
export function helpHref(slug?: string) {
  return slug ? `/help#${slug}` : '/help';
}

/**
 * Renders an answer: blank lines split paragraphs, lines starting with "- " form a
 * bulleted list, **double asterisks** make bold. Built as React nodes (no HTML
 * injection), so admin-entered text is always escaped.
 */
export function FaqAnswer({ text, className = '' }: { text: string; className?: string }) {
  const blocks: Array<{ kind: 'p' | 'ul'; lines: string[] }> = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ kind: 'p', lines: [] }); // paragraph break
      continue;
    }
    const kind = line.startsWith('- ') ? 'ul' : 'p';
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind && last.lines.length) last.lines.push(kind === 'ul' ? line.slice(2) : line);
    else blocks.push({ kind, lines: [kind === 'ul' ? line.slice(2) : line] });
  }
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.kind === 'ul' ? (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.lines.map((l, j) => (
                <li key={j}>{withBold(l)}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{withBold(b.lines.join(' '))}</p>
          ),
        )}
    </div>
  );
}

function withBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-gray-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Answer as plain text (bold markers removed), for search and FAQPage JSON-LD. */
export function plainAnswer(text: string) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}
