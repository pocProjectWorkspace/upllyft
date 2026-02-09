import { useQuery } from '@tanstack/react-query';
import {
  getProviders,
  getProvider,
  getProviderStats,
  getStates,
  getCities,
  getOrganizationTypes,
  type ProviderFilters,
} from '@/lib/api/providers';

const providerKeys = {
  all: ['providers'] as const,
  lists: () => [...providerKeys.all, 'list'] as const,
  list: (filters?: ProviderFilters) => [...providerKeys.lists(), filters] as const,
  detail: (id: string) => [...providerKeys.all, 'detail', id] as const,
  stats: (country?: string) => [...providerKeys.all, 'stats', country] as const,
  states: (country?: string) => [...providerKeys.all, 'states', country] as const,
  cities: (state: string, country?: string) => [...providerKeys.all, 'cities', state, country] as const,
  orgTypes: (country?: string) => [...providerKeys.all, 'org-types', country] as const,
};

export function useProviders(filters?: ProviderFilters) {
  return useQuery({
    queryKey: providerKeys.list(filters),
    queryFn: () => getProviders(filters),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: providerKeys.detail(id),
    queryFn: () => getProvider(id),
    enabled: !!id,
  });
}

export function useProviderStats(country?: string) {
  return useQuery({
    queryKey: providerKeys.stats(country),
    queryFn: () => getProviderStats(country),
  });
}

export function useStates(country?: string) {
  return useQuery({
    queryKey: providerKeys.states(country),
    queryFn: () => getStates(country),
  });
}

export function useCities(state: string, country?: string) {
  return useQuery({
    queryKey: providerKeys.cities(state, country),
    queryFn: () => getCities(state, country),
    enabled: !!state,
  });
}

export function useOrganizationTypes(country?: string) {
  return useQuery({
    queryKey: providerKeys.orgTypes(country),
    queryFn: () => getOrganizationTypes(country),
  });
}
