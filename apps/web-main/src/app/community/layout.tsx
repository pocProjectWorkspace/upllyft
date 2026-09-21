import type { Metadata } from 'next';
import { CommunityFrame } from '@/community/components/community-frame';

export const metadata: Metadata = {
  title: 'Upllyft - Community',
  description: 'Connect with parents, therapists, and educators in the neurodivergent community.',
  openGraph: {
    title: 'Upllyft - Neurodivergent Community',
    description: 'Connect with parents, therapists, and educators in the neurodivergent community.',
  },
};

/**
 * Community section of the hub (merged from the former web-community app).
 * The shared header comes from the root AppFrame; this layout adds the
 * community-specific floating SOS button and crisis dialog.
 */
export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <CommunityFrame>{children}</CommunityFrame>;
}
