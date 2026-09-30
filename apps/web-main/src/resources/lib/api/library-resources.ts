import { apiClient } from '@upllyft/api-client';

/**
 * Resource Library files: published by the Upllyft team (scope PLATFORM, visible to
 * everyone) or by an organisation (visible to its members). Uploaded from the admin
 * console and org workspaces; read-only for families.
 */
export interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  tags: string[];
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  scope: 'PLATFORM' | 'ORGANIZATION';
  organization?: { id: string; name: string } | null;
  createdAt: string;
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
