'use client';

import { TherapistImport } from '@/components/onboarding/therapist-import';

export default function AdminAddTherapistsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add therapists</h1>
        <p className="text-gray-500 mt-1">
          Import therapists from a spreadsheet. Each new therapist gets an email to set their password; their profile stays
          pending until verified.
        </p>
      </div>
      <TherapistImport apiBase="/admin/onboarding" />
    </div>
  );
}
