import { redirect } from 'next/navigation';

// The old booking dashboard was retired in favour of the therapist Hub (the root
// page), which carries its stats. Keep bookmarks and old links working by
// redirecting there.
export default function TherapistDashboardRedirect() {
  redirect('/');
}
