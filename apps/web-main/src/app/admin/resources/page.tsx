'use client';

import { ResourceManager } from '@/components/library-resources/resource-manager';

export default function AdminResourcesPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900">Platform resources</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Materials published here are visible to every user in the Resources app.
      </p>
      <ResourceManager
        scope="PLATFORM"
        audienceNote="Visible to everyone on Upllyft in the Resources app."
      />
    </div>
  );
}
