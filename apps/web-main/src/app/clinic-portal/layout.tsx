import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upllyft - Clinic portal',
  description: 'Sessions, reports, home activities, forms and consent from the clinics caring for your child.',
};

export default function ClinicPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50/50">{children}</div>;
}
