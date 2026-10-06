'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResourceViewer } from '@/resources/components/resource-viewer';
import type { LibraryResource } from '@/resources/lib/api/library-resources';
import type { LibraryCard } from './api';

/**
 * "Open" for any card: worksheets go to their page, uploaded files open in the
 * existing in-app viewer (signed links, view-only respected).
 */
export function useOpenResource() {
  const router = useRouter();
  const [viewing, setViewing] = useState<LibraryResource | null>(null);

  const open = useCallback(
    (card: LibraryCard) => {
      if (card.kind === 'WORKSHEET') {
        router.push(`/resources/${card.id}`);
        return;
      }
      if (!card.fileUrl) return;
      setViewing({
        id: card.id,
        title: card.title,
        fileUrl: card.fileUrl,
        downloadUrl: card.downloadUrl ?? null,
        downloadable: !!card.downloadUrl,
        mimeType: card.mimeType ?? 'application/pdf',
      } as LibraryResource);
    },
    [router],
  );

  const viewer = <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />;
  return { open, viewer };
}
