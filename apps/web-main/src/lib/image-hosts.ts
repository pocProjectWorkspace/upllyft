/**
 * Hosts the next/image optimizer may fetch from. Keep in sync with
 * `images.remotePatterns` in next.config.ts, which the `/_next/image`
 * endpoint enforces server-side; this client-side list only decides
 * whether an <Image> asks the optimizer at all (see components/app-image).
 */
const ALLOWED_HOSTS: RegExp[] = [
  /(^|\.)supabase\.co$/, // storage buckets (avatars, org assets, worksheet previews)
  /^lh3\.googleusercontent\.com$/, // Google OAuth avatars
  /^flagcdn\.com$/, // onboarding country flags
];

/** True for same-origin paths and https URLs on an allow-listed host. */
export function isOptimizableSrc(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const { protocol, hostname } = new URL(src);
    if (protocol === 'https:') return ALLOWED_HOSTS.some((re) => re.test(hostname));
    if (protocol === 'http:' && process.env.NODE_ENV !== 'production') {
      return hostname === 'localhost' || hostname === '127.0.0.1';
    }
  } catch {
    // data:, blob:, relative-without-slash, etc.
  }
  return false;
}
