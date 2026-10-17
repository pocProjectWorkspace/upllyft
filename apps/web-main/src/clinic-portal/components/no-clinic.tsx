'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';

/**
 * No clinic linked yet. Two ways in: book on Upllyft (the booking appears here once
 * confirmed), or type the invite code a clinic sent — that opens the same claim flow
 * as the emailed link, which links the child to the clinic's record.
 */
export function NoClinic({ childName }: { childName: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-6 py-9 sm:px-9">
      <div className="max-w-2xl">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#E8F6F1]">
          <Building2 className="h-6 w-6 text-[#0B7E6B]" />
        </div>
        <h2 className="mt-4 text-[22px] font-extrabold tracking-tight text-gray-900">No clinic connected yet</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-gray-600">
          When {childName} starts care with a clinic — or you book a session with a therapist on Upllyft — sessions, reports and
          forms show up here. Each clinic stays separate, so you can see Speech with one clinic and OT with another side by side.
        </p>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-[1.5px] border-gray-200 p-5">
          <div className="text-[15.5px] font-extrabold text-gray-900">Book on Upllyft</div>
          <p className="mt-1 text-[13px] leading-snug text-gray-500">
            Find a verified therapist and book a first consultation. It appears here as soon as it’s confirmed.
          </p>
          <Link href="/booking/find-care" className="mt-4 inline-flex rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-2.5 text-sm font-bold text-white">
            Find a therapist
          </Link>
        </div>
        <form
          className="rounded-2xl border-[1.5px] border-gray-200 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (cleaned.length === 12) router.push(`/claim/${cleaned}`);
          }}
        >
          <label htmlFor="invite-code" className="text-[15.5px] font-extrabold text-gray-900">
            Already seeing a clinic?
          </label>
          <p className="mt-1 text-[13px] leading-snug text-gray-500">
            Enter the invite code from your clinic’s email to link {childName}’s record. It works with the email address the clinic has for you.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. K7QM-4NXA-9PRT"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border-[1.5px] border-gray-200 px-3 py-2.5 text-sm font-semibold uppercase outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={cleaned.length !== 12}
              className="rounded-xl border-[1.5px] border-teal-500 bg-white px-4 py-2.5 text-sm font-bold text-[#0B7E6B] disabled:opacity-40"
            >
              Connect
            </button>
          </div>
        </form>
      </div>
      <div className="mt-7 border-t border-gray-100 pt-5">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-400">What you’ll be able to do here</div>
        <div className="mt-3 grid gap-3 text-[13.5px] font-semibold text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
          <span>See upcoming sessions &amp; assessments</span>
          <span>Reschedule or cancel online</span>
          <span>Read reports &amp; home activities</span>
          <span>Fill intake forms &amp; manage consent</span>
        </div>
      </div>
    </div>
  );
}
