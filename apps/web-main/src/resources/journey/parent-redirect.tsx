'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';

/**
 * Parents have one Resources home now — the journey at /resources. Older pages
 * (library, progress, homework) send them to the matching journey tab so bookmarks
 * and old links still land somewhere useful. Other roles are untouched.
 */
export function useParentJourneyRedirect(tab?: 'mine' | 'progress') {
  const { user } = useAuth();
  const router = useRouter();
  const isParent = user?.role === 'USER';
  useEffect(() => {
    if (isParent) router.replace(tab ? `/resources?tab=${tab}` : '/resources');
  }, [isParent, router, tab]);
  return isParent;
}
