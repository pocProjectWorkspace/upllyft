/**
 * People are addressed by their first name across the product — a greeting that
 * reads "Welcome back, Priya" lands warmer than the full legal name we store.
 * Falls back to the email local-part, then the caller's placeholder.
 */
export function firstNameOf(
  name?: string | null,
  email?: string | null,
  fallback = 'there',
): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  if (first) return first;

  const localPart = (email ?? '').split('@')[0]?.trim();
  if (localPart) return localPart;

  return fallback;
}
