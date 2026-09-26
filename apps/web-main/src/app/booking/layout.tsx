import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upllyft - Booking',
  description: 'Find verified therapists and book sessions for your child.',
};

/**
 * Booking section of the hub (merged from the former web-booking app).
 * The shared header comes from the root AppFrame; pages keep using
 * BookingShell for their auth guard and content container.
 */
export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50/50">{children}</div>;
}
