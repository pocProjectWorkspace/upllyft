'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@upllyft/api-client';
import { DEPARTMENTS, type DepartmentKey } from '@upllyft/types';
import { getTherapistContact, type TherapistProfile } from '@/booking/lib/api/marketplace';

/**
 * Directory listings come from an admin upload: they are not on Upllyft booking, so a
 * parent reaches them directly. Phone and email load only when "Show contact" is pressed.
 */

const COUNTRY_NAMES: Record<string, string> = { IN: 'India', AE: 'UAE', SA: 'Saudi Arabia' };

export function DirectoryBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ${className}`}
    >
      Directory listing
    </span>
  );
}

/** Department, licence number and where they practise, as uploaded. */
export function DirectoryDetails({ therapist, className = '' }: { therapist: TherapistProfile; className?: string }) {
  const department = therapist.department ? DEPARTMENTS[therapist.department as DepartmentKey]?.label : null;
  const country = therapist.location?.country ?? therapist.country ?? null;
  const city = therapist.location?.city ?? therapist.city ?? null;
  const place = [city, country ? (COUNTRY_NAMES[country] ?? country) : null].filter(Boolean).join(', ');
  const rows: Array<[string, string]> = [];
  if (department) rows.push(['Department', department]);
  if (therapist.licenceNumber) rows.push(['Licence no.', therapist.licenceNumber]);
  if (place) rows.push(['Location', place]);
  if (!rows.length) return null;
  return (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs ${className}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-gray-500">{label}</dt>
          <dd className="truncate font-medium text-gray-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Show contact" for signed-in parents (and admins); reveals phone and email. */
export function ShowContact({ therapistId, className = '' }: { therapistId: string; className?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const canSee = user?.role === 'USER' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace', 'therapist-contact', therapistId],
    queryFn: () => getTherapistContact(therapistId),
    enabled: open && canSee,
    staleTime: 10 * 60 * 1000,
  });

  if (!canSee) {
    return (
      <p className={`rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-xs text-gray-500 ${className}`}>
        Contact details are shown to parents
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`w-full rounded-[10px] bg-teal-600 px-3 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-teal-700 ${className}`}
      >
        Show contact
      </button>
    );
  }

  return (
    <div className={`space-y-1 rounded-[10px] border border-teal-100 bg-teal-50 px-3 py-2 text-[13px] ${className}`}>
      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : isError || !data ? (
        <p className="text-gray-500">Contact details are not available.</p>
      ) : (
        <>
          {data.phone && (
            <a href={`tel:${data.phone.replace(/[^\d+]/g, '')}`} className="block truncate font-semibold text-teal-700 hover:underline">
              📞 {data.phone}
            </a>
          )}
          <a href={`mailto:${data.email}`} className="block truncate font-semibold text-teal-700 hover:underline">
            ✉️ {data.email}
          </a>
        </>
      )}
    </div>
  );
}

export const DIRECTORY_NOTE = 'Not bookable on Upllyft — contact the therapist directly.';
