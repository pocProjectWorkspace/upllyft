import { Skeleton } from '@upllyft/ui';

/**
 * Content-shaped loading states, so a page shows its outline while data loads
 * instead of a lone spinner (CLAUDE.md: "No full-screen spinner gates").
 *
 * `bare` drops the page padding/width for use inside a shell or layout that already
 * provides it (AdminShell, the org workspace, the admin console).
 *
 * For dashboards use `PageSkeleton` from @upllyft/ui.
 */

function Frame({ bare, children }: { bare?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={bare ? 'space-y-6' : 'max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6'}
      aria-busy="true"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

function Heading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-56 rounded-lg" />
      <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
    </div>
  );
}

/** A dashboard/report: stat tiles and panels. PageSkeleton's shape, with `bare`. */
export function DashboardSkeleton({ blocks = 2, bare }: { blocks?: number; bare?: boolean }) {
  return (
    <Frame bare={bare}>
      <Heading />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: blocks }).map((_, i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </Frame>
  );
}

/** Plain bars — for table bodies, dropdowns, modals and small panels. */
export function LinesSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 text-left ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-9 rounded-lg ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Rows only — for a list or panel inside an already-rendered page. */
export function RowsSkeleton({ rows = 4, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** A list page: title, a filter/search bar, rows. */
export function ListSkeleton({ rows = 6, bare }: { rows?: number; bare?: boolean }) {
  return (
    <Frame bare={bare}>
      <Heading />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64 max-w-full rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <RowsSkeleton rows={rows} />
    </Frame>
  );
}

/** A detail page: header card with avatar, tab strip, content blocks. */
export function DetailSkeleton({ bare }: { bare?: boolean }) {
  return (
    <Frame bare={bare}>
      <Skeleton className="h-5 w-32 rounded" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-full rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </Frame>
  );
}

/** A form/settings page: title, labelled fields, a save button. */
export function FormSkeleton({ fields = 5, bare }: { fields?: number; bare?: boolean }) {
  return (
    <Frame bare={bare}>
      <Heading />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-3xl">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </Frame>
  );
}

/** A small card grid (e.g. profile, bookmarks, trending before auth resolves). */
export function CardsSkeleton({ cards = 6, bare }: { cards?: number; bare?: boolean }) {
  return (
    <Frame bare={bare}>
      <Heading />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </Frame>
  );
}

/** A chat/thread area: alternating message bubbles. */
export function ThreadSkeleton() {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-live="polite">
      {[60, 40, 70, 35, 55].map((w, i) => (
        <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
          <Skeleton className="h-10 rounded-2xl" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}
