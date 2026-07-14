'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useFacilities, useFacility } from '@/hooks/use-nursery';
import type { Facility, FacilitySummary } from '@/lib/api/nursery';

/**
 * Which facility is this nursery user working in?
 *
 * AUTHORITY IS MEMBERSHIP, NOT ROLE. `GET /facilities` returns only the facilities
 * the caller actually staffs — the server resolves that from `FacilityMember`, so
 * an empty list means "you staff nothing", not "you are the wrong kind of user".
 * The client never decides who may see a nursery; it only renders what the server
 * already agreed to return.
 */
interface NurseryContextValue {
  /** Facilities the user staffs that are NOT clinics. */
  facilities: FacilitySummary[];
  facilityId: string | null;
  setFacilityId: (id: string) => void;
  facility: Facility | undefined;
  isLoading: boolean;
}

const NurseryContext = createContext<NurseryContextValue | null>(null);

export function NurseryProvider({ children }: { children: ReactNode }) {
  const { data: all, isLoading: loadingList } = useFacilities();
  const [selected, setSelected] = useState<string | null>(null);

  // A nursery user might also staff a clinic (a nursery group with an in-house SLT
  // is a real thing). This surface is only ever about the non-clinical settings.
  const facilities = useMemo(
    () => (all ?? []).filter(f => f.type === 'NURSERY' || f.type === 'SCHOOL'),
    [all],
  );

  const facilityId = selected ?? facilities[0]?.id ?? null;
  const { data: facility, isLoading: loadingOne } = useFacility(facilityId ?? undefined);

  return (
    <NurseryContext.Provider
      value={{
        facilities,
        facilityId,
        setFacilityId: setSelected,
        facility,
        isLoading: loadingList || (!!facilityId && loadingOne),
      }}
    >
      {children}
    </NurseryContext.Provider>
  );
}

export function useNursery() {
  const ctx = useContext(NurseryContext);
  if (!ctx) throw new Error('useNursery must be used inside <NurseryProvider>');
  return ctx;
}
