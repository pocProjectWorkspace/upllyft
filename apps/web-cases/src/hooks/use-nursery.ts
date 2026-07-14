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
