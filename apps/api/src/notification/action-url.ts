/**
 * Notification links, as hub routes. Pure — unit-tested in action-url.spec.ts.
 *
 * Notifications created before the hub merge (and some code paths since) point at the
 * retired standalone apps' routes: `/patients`, `/posts/:id`, `/events`, `/bookings/:id`…
 * Those 404 in web-main, where each section lives under its own prefix. Links are
 * rewritten when a notification is stored and again when one is read or emailed, so rows
 * already in the database open the right page too.
 */

type Rule = [RegExp, string | ((m: RegExpMatchArray) => string)];

/** First match wins. Paths are matched without the query string / hash, which are kept. */
const RULES: Rule[] = [
  // clinic admin
  [/^\/patients\/([^/]+)$/, (m) => `/clinic/patients/${m[1]}`],
  [/^\/patients$/, '/clinic/patients'],
  // community
  [/^\/posts\/([^/]+)$/, (m) => `/community/posts/${m[1]}`],
  [/^\/questions\/([^/]+)$/, (m) => `/community/questions/${m[1]}`],
  [/^\/questions$/, '/community/questions'],
  [/^\/events\/([^/]+)$/, (m) => `/community/events/${m[1]}`],
  [/^\/events$/, '/community/events'],
  // `/community/<id>` was a community page; the hub has it under /community/communities/<id>.
  [/^\/community\/(?!communities|posts|questions|events|crisis|providers|community)([^/]+)$/, (m) => `/community/communities/${m[1]}`],
  // booking
  [/^\/bookings\/([^/]+)$/, (m) => `/booking/bookings/${m[1]}`],
  [/^\/bookings$/, '/booking/bookings'],
  [/^\/invoices$/, '/booking/invoices'],
  // screening
  [/^\/shared$/, '/screening/shared'],
  // resources
  [/^\/resources\/worksheets\/assignments(\/[^/]+)?$/, '/resources/assignments'],
  // messages: one page; the conversation id rides along as ?c=
  [/^\/messages\/([^/]+)$/, (m) => `/messages?c=${encodeURIComponent(m[1])}`],
  // settings sub-pages that never existed in the hub
  [/^\/settings\/security$/, '/settings?tab=account'],
  [/^\/settings\/verification$/, '/profile'],
];

/** An app-relative notification link, rewritten to its hub route. Absolute URLs pass through. */
export function hubActionUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || !url.startsWith('/')) return url;

  const cut = url.search(/[?#]/);
  const path = (cut < 0 ? url : url.slice(0, cut)).replace(/\/+$/, '') || '/';
  const rest = cut < 0 ? '' : url.slice(cut);

  for (const [pattern, to] of RULES) {
    const m = path.match(pattern);
    if (!m) continue;
    const target = typeof to === 'string' ? to : to(m);
    // Merge a query string the rule added (messages ?c=) with one the link already had.
    if (target.includes('?') && rest.startsWith('?')) return `${target}&${rest.slice(1)}`;
    return target + rest;
  }
  return url;
}

/** Q&A notifications were stored without a link; they carry the question as relatedPostId. */
const QUESTION_TYPES = new Set(['NEW_ANSWER', 'ANSWER_ACCEPTED', 'QUESTION_ANSWERED']);

/** The link to open for a stored notification. */
export function notificationLink(n: { actionUrl?: string | null; type?: string | null; relatedPostId?: string | null }): string | null {
  if (n.actionUrl) return hubActionUrl(n.actionUrl);
  if (n.relatedPostId && n.type && QUESTION_TYPES.has(n.type)) return `/community/questions/${n.relatedPostId}`;
  return null;
}
