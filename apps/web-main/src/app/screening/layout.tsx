import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upllyft - Milestone Map',
  description: 'Developmental screenings and insights for your child.',
};

/**
 * Screening section of the hub (merged from the former web-screening app).
 * The shared header comes from the root AppFrame; pages keep using
 * ScreeningShell for their auth guard and content container.
 */
export default function ScreeningLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50/50">{children}</div>;
}
