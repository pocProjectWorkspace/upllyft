import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  getPlatformSettings,
  updatePlatformSettings,
  getTherapistsWithCommission,
  updateTherapistCommission,
  type UpdatePlatformSettingsDto,
} from '@/lib/api/marketplace-admin';

const adminKeys = {
  all: ['marketplace-admin'] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
  therapists: (search?: string) => [...adminKeys.all, 'therapists', search] as const,
};

export function usePlatformSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: getPlatformSettings,
  });
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePlatformSettingsDto) => updatePlatformSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.settings() });
      toast({ title: 'Settings updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update settings.', variant: 'destructive' });
    },
  });
}

export function useTherapistsWithCommission(search?: string) {
  return useQuery({
    queryKey: adminKeys.therapists(search),
    queryFn: () => getTherapistsWithCommission(search ? { search } : undefined),
    staleTime: 30 * 1000,
  });
}

export function useUpdateTherapistCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ therapistId, commission }: { therapistId: string; commission: number }) =>
      updateTherapistCommission(therapistId, commission),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.therapists() });
      toast({ title: 'Commission updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update commission.', variant: 'destructive' });
    },
  });
}
