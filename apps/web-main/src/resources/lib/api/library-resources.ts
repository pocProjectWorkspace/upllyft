import { apiClient } from '@upllyft/api-client';

/**
 * Resource Library files: published by the Upllyft team (scope PLATFORM) or by an
 * organisation (scope ORGANIZATION), each aimed at an audience. The API only returns
 * what is aimed at the viewer. Uploaded from the admin console and org workspaces;
 * read-only for families.
 */
export interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  tags: string[];
  /** Short-lived signed link that opens the file inline. */
  fileUrl: string | null;
  /** Short-lived signed link that saves the file; null when the resource is view-only. */
  downloadUrl: string | null;
  downloadable: boolean;
  fileName: string;
  mimeType: string;
  fileSize: number;
  scope: 'PLATFORM' | 'ORGANIZATION';
  audience: 'EVERYONE' | 'ALL_ORGS' | 'ORGS';
  audienceSegment: 'ALL' | 'FAMILIES' | 'STAFF';
  organization?: { id: string; name: string } | null;
  createdAt: string;
}

/** Types the in-app viewer can show; everything else (Word, PowerPoint) is downloaded. */
export function isViewable(mimeType: string) {
  return mimeType === 'application/pdf' || mimeType === 'video/mp4' || mimeType.startsWith('image/');
}

export async function getLibraryResources(
  params: { resourceType?: string; search?: string } = {},
): Promise<LibraryResource[]> {
  const { data } = await apiClient.get('/library-resources', {
    params: {
      ...(params.resourceType ? { resourceType: params.resourceType } : {}),
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return data.resources as LibraryResource[];
}
