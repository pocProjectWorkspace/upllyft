import { redirect } from 'next/navigation';

// The standalone availability page was merged into the unified Bookings & Availability
// view (handoff v5). Keep the route working by redirecting into it.
export default function TherapistAvailabilityRedirect() {
  redirect('/therapist/bookings');
}
