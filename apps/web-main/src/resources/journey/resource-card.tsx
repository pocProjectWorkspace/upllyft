'use client';

import { memo } from 'react';
import type { LibraryCard } from './api';
import { DomainBadge, StatusPill } from './ui';

interface ResourceCardProps {
  card: LibraryCard;
  childName: string;
  onSave?: (card: LibraryCard) => void;
  onTried?: (card: LibraryCard) => void;
  onOpen: (card: LibraryCard) => void;
  saving?: boolean;
  /** Therapist picker: one primary action instead of save / tried. */
  onPick?: (card: LibraryCard) => void;
  pickLabel?: string;
}

/** One library card — the same for worksheets and uploaded files. */
export const ResourceCard = memo(function ResourceCard({
  card,
  childName,
  onSave,
  onTried,
  onOpen,
  saving,
  onPick,
  pickLabel = 'Assign',
}: ResourceCardProps) {
  const ages =
    card.ageMin != null || card.ageMax != null ? `Ages ${card.ageMin ?? '?'}–${card.ageMax ?? '?'}` : null;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {card.domains.slice(0, 2).map((d) => (
          <DomainBadge key={d} domain={d} />
        ))}
        {card.matchesScreening && (
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-100">
            Matches screening
          </span>
        )}
        {card.status && <StatusPill status={card.status} />}
      </div>

      <div className="mb-1 text-xs font-medium text-gray-500">
        {card.type}
        {card.durationMinutes ? ` · ${card.durationMinutes} min` : ''}
      </div>
      <h3 className="mb-2 text-base font-semibold leading-snug text-gray-900">{card.title}</h3>

      {card.practises && (
        <p className="mb-1 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Practises:</span> {card.practises}
        </p>
      )}
      {card.forText && <p className="mb-1 text-sm text-gray-600">For: {card.forText}</p>}

      <p className="mt-auto pt-3 text-xs text-gray-400">
        {[ages, card.source].filter(Boolean).join(' · ')}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onPick ? (
          <button
            type="button"
            onClick={() => onPick(card)}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white hover:from-teal-600 hover:to-teal-700"
          >
            {pickLabel}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onTried?.(card)}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:from-teal-600 hover:to-teal-700"
            >
              I tried this
            </button>
            {card.savedItemId ? (
              <span className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700">Saved for {childName}</span>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => onSave?.(card)}
                className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
              >
                Save for {childName}
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => onOpen(card)}
          className="ml-auto text-sm font-semibold text-teal-700 hover:underline"
        >
          Open →
        </button>
      </div>
    </article>
  );
});
