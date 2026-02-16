import { useCallback, useRef } from 'react';
import { trackInteraction, type FeedInteraction } from '@/lib/api/feeds';

export function useFeedInteraction() {
  const viewTimers = useRef<Map<string, number>>(new Map());

  const trackView = useCallback((postId: string) => {
    // Record when the post came into view
    viewTimers.current.set(postId, Date.now());

    trackInteraction({ postId, action: 'view' }).catch(() => {
      // Silently fail — interaction tracking is non-critical
    });
  }, []);

  const trackClick = useCallback((postId: string) => {
    const startTime = viewTimers.current.get(postId);
    const duration = startTime ? Date.now() - startTime : undefined;

    trackInteraction({ postId, action: 'click', duration }).catch(() => {});
  }, []);

  const trackEngagement = useCallback(
    (postId: string, scrollDepth?: number) => {
      const startTime = viewTimers.current.get(postId);
      const duration = startTime ? Date.now() - startTime : undefined;

      trackInteraction({
        postId,
        action: 'engagement',
        duration,
        scrollDepth,
      }).catch(() => {});
    },
    [],
  );

  const trackHide = useCallback((postId: string) => {
    viewTimers.current.delete(postId);

    trackInteraction({ postId, action: 'hide' }).catch(() => {});
  }, []);

  return {
    trackView,
    trackClick,
    trackEngagement,
    trackHide,
  };
}
