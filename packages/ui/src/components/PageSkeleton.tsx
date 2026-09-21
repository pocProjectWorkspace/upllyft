import { Skeleton } from './skeleton';

export interface PageSkeletonProps {
  /** Number of content blocks to render. */
  blocks?: number;
  className?: string;
}

/**
 * Generic content-area placeholder used by route `loading.tsx` files and by
 * app shells while the session resolves. The app header stays mounted in the
 * layout above it, so only the content region pulses.
 */
export function PageSkeleton({ blocks = 3, className = '' }: PageSkeletonProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 ${className}`} aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: blocks }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}
