import { useQuery } from '@tanstack/react-query';
import { searchClinics, getClinic, type ClinicSearchFilters } from '@/lib/api/clinics';

const clinicKeys = {
  all: ['clinics'] as const,
  list: (filters?: ClinicSearchFilters) => [...clinicKeys.all, 'list', filters] as const,
  detail: (id: string) => [...clinicKeys.all, 'detail', id] as const,
};

export function useSearchClinics(filters?: ClinicSearchFilters) {
  return useQuery({
    queryKey: clinicKeys.list(filters),
    queryFn: () => searchClinics(filters),
    staleTime: 30_000,
  });
}

export function useClinic(clinicId: string) {
  return useQuery({
    queryKey: clinicKeys.detail(clinicId),
    queryFn: () => getClinic(clinicId),
    enabled: !!clinicId,
  });
}
