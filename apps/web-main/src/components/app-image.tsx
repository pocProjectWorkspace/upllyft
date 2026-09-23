'use client';

import Image, { type ImageProps } from 'next/image';
import { isOptimizableSrc } from '@/lib/image-hosts';

/**
 * next/image with a safety valve: sources on hosts we control go through the
 * optimizer; anything else (admin-entered URLs, third-party CDNs) is rendered
 * as-is via `unoptimized`. That keeps `/_next/image` from being an open fetch
 * proxy and avoids the "hostname is not configured" runtime error.
 */
export function AppImage(props: ImageProps) {
  const src = typeof props.src === 'string' ? props.src : null;
  const unoptimized = props.unoptimized ?? (src !== null ? !isOptimizableSrc(src) : false);
  return <Image {...props} unoptimized={unoptimized} />;
}

export default AppImage;
