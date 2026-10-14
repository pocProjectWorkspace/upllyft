import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { toast } from '@upllyft/ui';
import type { LibraryCard, ResourceKind } from '@/resources/journey/api';
import type { WorksheetDifficulty, WorksheetType } from '@/resources/lib/api/worksheets';

export interface SavedItem extends LibraryCard {
  savedId: string;
  savedAt: string;
  difficulty: WorksheetDifficulty | null;
  thumbnailUrl: string | null;
  collectionIds: string[];
  usage: { clientCount: number; lastUsedAt: string | null };
  canCustomise: boolean;
}

export interface SavedCollection {
  id: string;
  name: string;
  count: number;
}

export interface SavedPage {
  items: SavedItem[];
  collections: SavedCollection[];
  counts: { saved: number; created: number };
}

export interface Creation {
  id: string;
  title: string;
  type: WorksheetType;
  subType: string;
  difficulty: WorksheetDifficulty;
  targetDomains: string[];
  status: 'DRAFT' | 'PUBLISHED';
  generating: boolean;
  previewUrl: string | null;
  isPublic: boolean;
  updatedAt: string;
  basedOn: string | null;
}

export interface CreationsPage {
  items: Creation[];
  counts: { all: number; draft: number; published: number };
}

const base = '/my-library';

export const myLibraryApi = {
  saved: async (): Promise<SavedPage> => (await apiClient.get(`${base}/saved`)).data,
  savedRefs: async (): Promise<{ worksheetIds: string[]; libraryResourceIds: string[] }> =>
    (await apiClient.get(`${base}/saved/refs`)).data,
  save: async (kind: ResourceKind, id: string) => (await apiClient.post(`${base}/saved/${kind}/${id}`)).data,
  unsave: async (kind: ResourceKind, id: string) => (await apiClient.delete(`${base}/saved/${kind}/${id}`)).data,
  createCollection: async (name: string): Promise<{ id: string; name: string }> =>
    (await apiClient.post(`${base}/collections`, { name })).data,
  addToCollection: async (collectionId: string, savedIds: string[]): Promise<{ added: number }> =>
    (await apiClient.post(`${base}/collections/${collectionId}/items`, { savedIds })).data,
  creations: async (): Promise<CreationsPage> => (await apiClient.get(`${base}/creations`)).data,
};

export const myLibraryKeys = {
  all: ['my-library'] as const,
  saved: () => ['my-library', 'saved'] as const,
  refs: () => ['my-library', 'refs'] as const,
  creations: () => ['my-library', 'creations'] as const,
};

/**
 * Saved state for a Resource Library card's bookmark. Shares the cache My Library
 * invalidates, so unsaving there shows as unsaved here (and the other way round).
 */
export function useSavedState(enabled = true) {
  const qc = useQueryClient();
  const refs = useQuery({ queryKey: myLibraryKeys.refs(), queryFn: myLibraryApi.savedRefs, enabled });
  const toggle = useMutation({
    mutationFn: ({ kind, id, saved }: { kind: ResourceKind; id: string; saved: boolean }) =>
      saved ? myLibraryApi.unsave(kind, id) : myLibraryApi.save(kind, id),
    onSuccess: (_r, v) => {
      toast({ title: v.saved ? 'Removed from My Library' : 'Saved to My Library' });
      qc.invalidateQueries({ queryKey: myLibraryKeys.all });
    },
    onError: () => toast({ title: 'Couldn’t update My Library. Try again.', variant: 'destructive' }),
  });
  const isSaved = (kind: ResourceKind, id: string) =>
    kind === 'WORKSHEET'
      ? !!refs.data?.worksheetIds.includes(id)
      : !!refs.data?.libraryResourceIds.includes(id);
  return { isSaved, toggle, ready: refs.isSuccess };
}
