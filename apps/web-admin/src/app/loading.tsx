import { PageSkeleton } from '@upllyft/ui';

// Shown by the App Router while a route segment's code and data load.
// The header is mounted in the root layout, so only the content pulses.
export default function Loading() {
  return <PageSkeleton />;
}
