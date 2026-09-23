// Server-only: imported from the root layout (a server component); never import from client code.
import type { User } from '@upllyft/types';

/**
 * Server-side /auth/me for the root layout (PERFORMANCE_AUDIT.md #35).
 *
 * Called with the access-token cookie value; the returned promise is passed
 * to the client AuthProvider and streamed with the HTML. It resolves null on
 * any failure (no API URL, timeout, 401) so the client falls back to its own
 * flow, and it never rejects because a rejected promise would surface as a
 * render error on the client.
 */
const API_ORIGIN = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TIMEOUT_MS = Number(process.env.SERVER_AUTH_TIMEOUT_MS || 2500);

export async function fetchServerUser(accessToken: string): Promise<User | null> {
  if (!accessToken || isExpired(accessToken)) return null;
  try {
    const res = await fetch(`${API_ORIGIN}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
    return null;
  }
}

/** Cheap local check so an expired token never triggers a doomed API call. */
function isExpired(jwt: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
