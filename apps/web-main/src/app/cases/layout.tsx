import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upllyft - Case Management',
  description: 'Therapist case management, IEPs, sessions and milestones.',
};

/**
 * Cases section of the hub (merged from the former web-cases app).
 * The shared header comes from the root AppFrame; the (cases) and (nursery)
 * route-group layouts below provide their own guards and sidebars.
 */
export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
