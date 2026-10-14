'use client';

import type { ResourceKind } from '@/resources/journey/api';
import { useSavedState } from './api';

/** Bookmark on a Resource Library card: saves it to (or removes it from) My Library. */
export function SaveButton({
  kind,
  id,
  title,
  className = '',
}: {
  kind: ResourceKind;
  id: string;
  title: string;
  className?: string;
}) {
  const { isSaved, toggle, ready } = useSavedState();
  if (!ready) return null;
  const saved = isSaved(kind, id);
  const label = saved ? `Remove ${title} from My Library` : `Save ${title} to My Library`;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={saved}
      title={saved ? 'Saved to My Library' : 'Save to My Library'}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ kind, id, saved });
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors disabled:opacity-60 ${
        saved ? 'border-teal-600 bg-teal-600 text-white' : 'border-gray-200 bg-white text-gray-500 hover:text-teal-700'
      } ${className}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 4a1 1 0 011-1h12a1 1 0 011 1v17l-7-4-7 4V4z" />
      </svg>
    </button>
  );
}
