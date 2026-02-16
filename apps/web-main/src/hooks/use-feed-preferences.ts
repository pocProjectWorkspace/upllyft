import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPreferences,
  updatePreferences,
  addMutedKeyword,
  removeMutedKeyword,
  addPreferredCategory,
  removePreferredCategory,
  type FeedPreferences,
  type FeedDensity,
} from '@/lib/api/feeds';

const DEFAULT_PREFERENCES: FeedPreferences = {
  density: 'comfortable',
  contentWeights: {
    discussions: 1,
    questions: 1,
    resources: 1,
    caseStudies: 1,
  },
  mutedKeywords: [],
  preferredCategories: [],
};

export function useFeedPreferences() {
  const queryClient = useQueryClient();
  const queryKey = ['feed', 'preferences'];

  const {
    data: preferences = DEFAULT_PREFERENCES,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: getPreferences,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Local density for immediate UI response
  const [localDensity, setLocalDensity] = useState<FeedDensity>(
    preferences.density,
  );

  useEffect(() => {
    setLocalDensity(preferences.density);
  }, [preferences.density]);

  const updateMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const addKeywordMutation = useMutation({
    mutationFn: addMutedKeyword,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const removeKeywordMutation = useMutation({
    mutationFn: removeMutedKeyword,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: addPreferredCategory,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const removeCategoryMutation = useMutation({
    mutationFn: removePreferredCategory,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const setDensity = useCallback(
    (density: FeedDensity) => {
      setLocalDensity(density);
      updateMutation.mutate({ density });
    },
    [updateMutation],
  );

  const setContentWeights = useCallback(
    (weights: FeedPreferences['contentWeights']) => {
      updateMutation.mutate({ contentWeights: weights });
    },
    [updateMutation],
  );

  return {
    preferences,
    density: localDensity,
    isLoading,
    error,
    setDensity,
    setContentWeights,
    addMutedKeyword: addKeywordMutation.mutate,
    removeMutedKeyword: removeKeywordMutation.mutate,
    addPreferredCategory: addCategoryMutation.mutate,
    removePreferredCategory: removeCategoryMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
