/**
 * Booking is switched off until therapists are on board: every "Book session" control
 * shows a small "Coming soon" note instead. Set NEXT_PUBLIC_BOOKING_ENABLED=true (in
 * Vercel, then redeploy — it is read at build time) to turn booking on everywhere.
 */
export const BOOKING_ENABLED = process.env.NEXT_PUBLIC_BOOKING_ENABLED === 'true';

/** Stand-in for a "Book session" button while booking is off. */
export function BookingComingSoon({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 rounded-[10px] border border-amber-200 bg-amber-50 text-amber-800 ${
        compact ? 'px-3 py-2.5 text-[12.5px]' : 'px-4 py-3 text-sm'
      } font-semibold ${className}`}
    >
      <span className="whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white">
        Coming soon
      </span>
      {!compact && <span className="whitespace-nowrap">Online booking</span>}
    </div>
  );
}
