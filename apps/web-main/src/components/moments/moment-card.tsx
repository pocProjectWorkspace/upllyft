'use client';

import type { Moment } from '@/lib/api/moments';
import { CATEGORY_META, DOMAIN_LABELS, friendlyDate } from './meta';

export function MomentCard({ moment, onDelete }: { moment: Moment; onDelete?: () => void }) {
  const meta = moment.category ? CATEGORY_META[moment.category] : null;

  return (
    <div className={`rounded-xl border p-4 ${meta?.card ?? 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide">
        {meta && <span className={`px-2 py-0.5 rounded-full ${meta.tag}`}>{meta.label.toUpperCase()}</span>}
        <span className="text-gray-400">{friendlyDate(moment.occurredAt).toUpperCase()}</span>
        {moment.place && <span className="text-gray-400">· {moment.place}</span>}
        {onDelete && (
          <button
            onClick={onDelete}
            aria-label="Delete moment"
            className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      <p className="text-sm text-gray-800 mt-2">“{moment.text}”</p>
      {moment.domainTags.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {moment.domainTags.map((d) => DOMAIN_LABELS[d] ?? d).join(' + ')}
        </p>
      )}
    </div>
  );
}
