/**
 * Where should we send someone after they sign in?
 *
 * Read from `?next=` so a guardian who follows a claim link, signs in, and is bounced
 * to the login page lands back ON THE CLAIM — rather than on a dashboard, wondering
 * what happened to the child they were asked about.
 *
 * OPEN-REDIRECT GUARD. `next` arrives in a URL, and claim links arrive by EMAIL, which
 * is exactly the channel an attacker would use: `/login?next=https://evil.example` on
 * a real Upllyft domain is a credible-looking phishing hop. So only same-origin,
 * path-relative destinations are honoured — anything with a scheme, a host, or a
 * protocol-relative `//` prefix is discarded and we fall back to the default.
 *
 * Read from `window.location` rather than `useSearchParams()` so this can be called
 * from pages that are statically prerendered without dragging a Suspense boundary in.
 */
export function getSafeNext(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;

  const next = new URLSearchParams(window.location.search).get('next');
  if (!next) return fallback;

  // Must be a path on THIS origin: starts with a single '/', and is not '//host'
  // (protocol-relative) or '/\host' (which some parsers treat the same way).
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }

  return next;
}
