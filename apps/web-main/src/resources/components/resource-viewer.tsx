'use client';

import { Dialog, DialogContent, DialogTitle } from '@upllyft/ui';
import type { LibraryResource } from '@/resources/lib/api/library-resources';

interface ResourceViewerProps {
  resource: LibraryResource | null;
  onClose: () => void;
}

/**
 * Opens a library file inside the app. View-only resources get no download button and
 * the browser's own download affordances are hidden (PDF toolbar, video menu, right
 * click). That deters casual saving; it is not DRM — a signed link can still be saved
 * by someone determined, which is why the links expire after an hour.
 */
export function ResourceViewer({ resource, onClose }: ResourceViewerProps) {
  const r = resource;
  const blockMenu = r && !r.downloadable ? (e: React.MouseEvent) => e.preventDefault() : undefined;

  return (
    <Dialog open={!!r} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
        {r && (
          <>
            <div className="flex items-center gap-3 px-5 py-3 pr-12 border-b border-gray-100">
              <DialogTitle className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">
                {r.title}
              </DialogTitle>
              {r.downloadUrl ? (
                <a
                  href={r.downloadUrl}
                  className="text-sm font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
                >
                  Download
                </a>
              ) : (
                <span className="text-xs text-gray-400 whitespace-nowrap">View only</span>
              )}
            </div>
            <div className="bg-gray-50 h-[75vh]" onContextMenu={blockMenu}>
              {!r.fileUrl ? (
                <p className="p-8 text-center text-sm text-gray-500">
                  This file is unavailable right now — please try again.
                </p>
              ) : r.mimeType === 'application/pdf' ? (
                <iframe
                  src={r.downloadable ? r.fileUrl : `${r.fileUrl}#toolbar=0&navpanes=0`}
                  title={r.title}
                  className="w-full h-full border-0"
                />
              ) : r.mimeType === 'video/mp4' ? (
                <video
                  src={r.fileUrl}
                  controls
                  controlsList={r.downloadable ? undefined : 'nodownload'}
                  disablePictureInPicture={!r.downloadable}
                  className="w-full h-full bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL; not for the optimizer
                <img
                  src={r.fileUrl}
                  alt={r.title}
                  draggable={r.downloadable}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
