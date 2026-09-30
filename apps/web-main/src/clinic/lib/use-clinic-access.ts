'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@upllyft/api-client';
import { getPracticeStatus } from './admin-api';
import { clinicKeys } from './query-keys';

/**
 * Who may administer the clinic section.
 *
 * Not role-only any more: a therapist who set up their own practice owns that
 * clinic and gets the clinic-admin screens (Therapists, Revenue, Settings) for it.
 * Platform ADMIN/SUPERADMIN keep them unconditionally, as before.
 */
export function useClinicAccess() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isTherapist = user?.role === 'THERAPIST';

  const { data: practice, isPending } = useQuery({
    queryKey: clinicKeys.practice(),
    queryFn: getPracticeStatus,
    enabled: isTherapist,
    staleTime: 5 * 60 * 1000,
  });

  return {
    canManageClinic: isPlatformAdmin || !!practice?.canManageClinic,
    practice,
    /** A therapist with no clinic at all — offer to set up their own practice. */
    needsPractice: isTherapist && practice?.status === 'NONE',
    isLoading: isTherapist && isPending,
  };
}
