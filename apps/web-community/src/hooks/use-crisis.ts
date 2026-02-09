import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getCrisisResources,
  getEmergencyContacts,
  detectCrisis,
  type CrisisResourceFilters,
} from '@/lib/api/crisis';

const crisisKeys = {
  all: ['crisis'] as const,
  resources: (filters?: CrisisResourceFilters) => [...crisisKeys.all, 'resources', filters] as const,
  emergency: () => [...crisisKeys.all, 'emergency'] as const,
};

export function useCrisisResources(filters?: CrisisResourceFilters) {
  return useQuery({
    queryKey: crisisKeys.resources(filters),
    queryFn: () => getCrisisResources(filters),
  });
}

export function useEmergencyContacts() {
  return useQuery({
    queryKey: crisisKeys.emergency(),
    queryFn: getEmergencyContacts,
  });
}

export function useDetectCrisis() {
  return useMutation({
    mutationFn: (content: string) => detectCrisis(content),
  });
}
