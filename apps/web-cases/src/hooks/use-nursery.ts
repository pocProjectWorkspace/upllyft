'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as nurseryApi from '@/lib/api/nursery';
import type { FacilityRole } from '@/lib/api/nursery';

const keys = {
  all: ['nursery'] as const,
  facilities: () => [...keys.all, 'facilities'] as const,
  facility: (id: string) => [...keys.all, 'facility', id] as const,
  rooms: (id: string) => [...keys.all, 'rooms', id] as const,
  members: (id: string) => [...keys.all, 'members', id] as const,
  roster: (id: string) => [...keys.all, 'roster', id] as const,
};

// ── Facilities ──

export function useFacilities() {
  return useQuery({
    queryKey: keys.facilities(),
    queryFn: nurseryApi.listFacilities,
  });
}

export function useFacility(id: string | undefined) {
  return useQuery({
    queryKey: keys.facility(id ?? ''),
    queryFn: () => nurseryApi.getFacility(id!),
    enabled: !!id,
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: nurseryApi.createFacility,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.facilities() }),
  });
}

// ── Rooms ──

export function useRooms(facilityId: string | undefined) {
  return useQuery({
    queryKey: keys.rooms(facilityId ?? ''),
    queryFn: () => nurseryApi.listRooms(facilityId!),
    enabled: !!facilityId,
  });
}

export function useCreateRoom(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; ageBandLabel?: string }) =>
      nurseryApi.createRoom(facilityId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rooms(facilityId) });
      qc.invalidateQueries({ queryKey: keys.facility(facilityId) });
    },
  });
}

export function useDeleteRoom(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => nurseryApi.deleteRoom(facilityId, roomId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rooms(facilityId) });
      qc.invalidateQueries({ queryKey: keys.facility(facilityId) });
    },
  });
}

// ── Staff ──

export function useMembers(facilityId: string | undefined) {
  return useQuery({
    queryKey: keys.members(facilityId ?? ''),
    queryFn: () => nurseryApi.listMembers(facilityId!),
    enabled: !!facilityId,
  });
}

export function useAddMember(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: FacilityRole }) =>
      nurseryApi.addMember(facilityId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members(facilityId) }),
  });
}

export function useRemoveMember(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => nurseryApi.removeMember(facilityId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members(facilityId) }),
  });
}

// ── Roster ──

export function useRoster(facilityId: string | undefined) {
  return useQuery({
    queryKey: keys.roster(facilityId ?? ''),
    queryFn: () => nurseryApi.getRoster(facilityId!),
    enabled: !!facilityId,
  });
}

export function useAddRosterChild(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof nurseryApi.addRosterChild>[1]) =>
      nurseryApi.addRosterChild(facilityId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.roster(facilityId) }),
  });
}

export function useUpdatePlacement(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      affiliationId,
      ...data
    }: {
      affiliationId: string;
      roomId?: string | null;
      keyworkerId?: string | null;
    }) => nurseryApi.updatePlacement(facilityId, affiliationId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.roster(facilityId) }),
  });
}

export function useResendClaim(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (affiliationId: string) => nurseryApi.resendClaim(facilityId, affiliationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.roster(facilityId) }),
  });
}

export function useEndEnrolment(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (affiliationId: string) => nurseryApi.endEnrolment(facilityId, affiliationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.roster(facilityId) }),
  });
}

export function useRequestScreeningConsent(facilityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (affiliationId: string) =>
      nurseryApi.requestScreeningConsent(facilityId, affiliationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.roster(facilityId) }),
  });
}

// ── Observations ──

export function useObservations(
  facilityId: string | undefined,
  childId: string,
  params?: { domain?: string; type?: nurseryApi.ObservationType },
) {
  return useQuery({
    queryKey: [...keys.all, 'observations', facilityId, childId, params] as const,
    queryFn: () => nurseryApi.listObservations(facilityId!, childId, params),
    enabled: !!facilityId && !!childId,
  });
}

export function useCreateObservation(facilityId: string, childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof nurseryApi.createObservation>[2]) =>
      nurseryApi.createObservation(facilityId, childId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...keys.all, 'observations', facilityId, childId] }),
  });
}

export function useDeleteObservation(facilityId: string, childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (observationId: string) =>
      nurseryApi.deleteObservation(facilityId, childId, observationId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...keys.all, 'observations', facilityId, childId] }),
  });
}

// ── Concerns ──

export function useConcerns(facilityId: string | undefined, childId: string) {
  return useQuery({
    queryKey: [...keys.all, 'concerns', facilityId, childId] as const,
    queryFn: () => nurseryApi.listConcerns(facilityId!, childId),
    enabled: !!facilityId && !!childId,
    retry: false, // a 403 (not an inclusion lead) should not retry — the panel hides
  });
}

export function useRaiseConcern(facilityId: string, childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => nurseryApi.raiseConcern(facilityId, childId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...keys.all, 'concerns', facilityId, childId] }),
  });
}

export function useUpdateConcernSummary(facilityId: string, childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ concernId, parentSummary }: { concernId: string; parentSummary: string }) =>
      nurseryApi.updateConcernSummary(facilityId, childId, concernId, parentSummary),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...keys.all, 'concerns', facilityId, childId] }),
  });
}

export function useShareConcern(facilityId: string, childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (concernId: string) => nurseryApi.shareConcern(facilityId, childId, concernId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...keys.all, 'concerns', facilityId, childId] }),
  });
}

// ── Support plans (F7 + F8) ──

const plansKey = (f: string | undefined, c: string) => [...keys.all, 'support-plans', f, c] as const;

export function useSupportPlans(facilityId: string | undefined, childId: string) {
  return useQuery({
    queryKey: plansKey(facilityId, childId),
    queryFn: () => nurseryApi.listSupportPlans(facilityId!, childId),
    enabled: !!facilityId && !!childId,
    retry: false, // a 403 (not an inclusion lead) should not retry — the panel hides
  });
}

/** One mutation factory keyed to (facility, child); every support-plan write invalidates the list. */
function usePlanMutation<TArgs>(
  facilityId: string,
  childId: string,
  fn: (args: TArgs) => Promise<nurseryApi.SupportPlan>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKey(facilityId, childId) }),
  });
}

export function useCreateSupportPlan(facilityId: string, childId: string) {
  return usePlanMutation(facilityId, childId, (data: Parameters<typeof nurseryApi.createSupportPlan>[2]) =>
    nurseryApi.createSupportPlan(facilityId, childId, data),
  );
}

export function useUpdateSupportPlan(facilityId: string, childId: string) {
  return usePlanMutation(
    facilityId,
    childId,
    ({ planId, data }: { planId: string; data: Parameters<typeof nurseryApi.updateSupportPlan>[3] }) =>
      nurseryApi.updateSupportPlan(facilityId, childId, planId, data),
  );
}

export function useAddOutcome(facilityId: string, childId: string) {
  return usePlanMutation(
    facilityId,
    childId,
    ({ planId, data }: { planId: string; data: nurseryApi.OutcomeInput }) =>
      nurseryApi.addOutcome(facilityId, childId, planId, data),
  );
}

export function useUpdateOutcome(facilityId: string, childId: string) {
  return usePlanMutation(
    facilityId,
    childId,
    ({ planId, outcomeId, data }: { planId: string; outcomeId: string; data: Parameters<typeof nurseryApi.updateOutcome>[4] }) =>
      nurseryApi.updateOutcome(facilityId, childId, planId, outcomeId, data),
  );
}

export function useAddIntervention(facilityId: string, childId: string) {
  return usePlanMutation(
    facilityId,
    childId,
    ({ planId, outcomeId, data }: { planId: string; outcomeId: string; data: Parameters<typeof nurseryApi.addIntervention>[4] }) =>
      nurseryApi.addIntervention(facilityId, childId, planId, outcomeId, data),
  );
}

export function useAddReview(facilityId: string, childId: string) {
  return usePlanMutation(
    facilityId,
    childId,
    ({ planId, data }: { planId: string; data: Parameters<typeof nurseryApi.addReview>[3] }) =>
      nurseryApi.addReview(facilityId, childId, planId, data),
  );
}

export function useShareSupportPlan(facilityId: string, childId: string) {
  return usePlanMutation(facilityId, childId, (planId: string) =>
    nurseryApi.shareSupportPlan(facilityId, childId, planId),
  );
}
