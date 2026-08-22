'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@upllyft/api-client';
import { getShortlist, toggleShortlist } from '@/lib/api/shortlist';

export function useShortlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shortlist'],
    queryFn: getShortlist,
    enabled: user?.role === 'USER',
  });
}

export function useToggleShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleShortlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortlist'] }),
  });
}

/** Set of saved provider ids (therapist + clinic) for instant heart state on cards. */
export function useShortlistIds(): Set<string> {
  const { data } = useShortlist();
  return new Set(
    (data ?? []).flatMap((e) => [e.therapistId, e.clinicId].filter(Boolean) as string[]),
  );
}
