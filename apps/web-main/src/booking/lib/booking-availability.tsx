/**
 * Booking is switched off until therapists are on board: every "Book session" control
 * shows a small "Coming soon" note instead. Set NEXT_PUBLIC_BOOKING_ENABLED=true (in
 * Vercel, then redeploy — it is read at build time) to turn booking on everywhere.
 */
export const BOOKING_ENABLED = process.env.NEXT_PUBLIC_BOOKING_ENABLED === 'true';

/** Stand-in for a "Book session" button while booking is off: the button greyed out, a green "Coming soon" tag on its top edge. */
export function BookingComingSoon({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div role="status" className={`relative ${className}`}>
      <span className="absolute -top-2.5 right-2 z-10 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
        Coming soon
      </span>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`w-full cursor-not-allowed whitespace-nowrap rounded-[10px] border border-gray-200 bg-gray-100 font-semibold text-gray-400 ${
          compact ? 'h-full px-3 py-2.5 text-[13.5px]' : 'h-12 px-4 text-base'
        }`}
      >
        Book session
      </button>
    </div>
  );
}
