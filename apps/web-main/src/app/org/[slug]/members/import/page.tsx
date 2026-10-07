'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TherapistImport } from '@/components/onboarding/therapist-import';

export default function OrgImportTherapistsPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href={`/org/${slug}/members`} className="text-sm text-teal-700 hover:underline">
          ← Members
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Import therapists</h1>
        <p className="text-gray-500 mt-1">
          Add your therapists from a spreadsheet. New therapists get an email to set their password and join your
          organisation; therapists already on Upllyft are added to it.
        </p>
      </div>
      <TherapistImport apiBase={`/organizations/${encodeURIComponent(slug)}/onboarding`} />
    </div>
  );
}
