/**
 * Facility capabilities — the API's runtime copy.
 *
 * MIRROR OF `packages/types/src/facility.ts`. The API cannot import @upllyft/types
 * at runtime (it is not a dependency, and Nest's build does not resolve the raw TS
 * the package exports), so shared contracts are mirrored locally — the same
 * convention as `src/clinical-templates/clinical-types.ts`.
 *
 * `scripts/check-capability-parity.mjs` fails the build if the two drift apart.
 * Change one, change the other.
 *
 * WHY A MAP AND NOT BRANCHES: `if (facility.type === 'NURSERY')` scattered through
 * services is how a nursery eventually ends up able to record a diagnosis, because
 * someone adds an endpoint and forgets the check. Capabilities are derived from
 * type in one place and enforced at the choke points.
 */

export type FacilityType = 'CLINIC' | 'NURSERY' | 'SCHOOL';

export const DATA_SCOPES = [
  'OBSERVATIONS_ONLY',
  'SCREENING_SHARED',
  'CLINICAL_SUMMARY',
  'FULL_CLINICAL',
] as const;

export type DataScope = (typeof DATA_SCOPES)[number];

export interface FacilityCapabilities {
  canCreateCase: boolean;
  canDiagnose: boolean;
  canWriteClinicalNotes: boolean;
  canScreen: boolean;
  canObserve: boolean;
  canRaiseConcern: boolean;
  canBill: boolean;
  maxDataScope: DataScope;
}

export const FACILITY_CAPABILITIES: Record<FacilityType, FacilityCapabilities> = {
  CLINIC: {
    canCreateCase: true,
    canDiagnose: true,
    canWriteClinicalNotes: true,
    canScreen: true,
    canObserve: true,
    canRaiseConcern: true,
    canBill: true,
    maxDataScope: 'FULL_CLINICAL',
  },
  NURSERY: {
    canCreateCase: false,
    canDiagnose: false,
    canWriteClinicalNotes: false,
    canScreen: true,
    canObserve: true,
    canRaiseConcern: true,
    canBill: false,
    maxDataScope: 'CLINICAL_SUMMARY',
  },
  SCHOOL: {
    canCreateCase: false,
    canDiagnose: false,
    canWriteClinicalNotes: false,
    canScreen: true,
    canObserve: true,
    canRaiseConcern: true,
    canBill: false,
    maxDataScope: 'CLINICAL_SUMMARY',
  },
};

export type FacilityCapability = keyof Omit<FacilityCapabilities, 'maxDataScope'>;

/** Does this facility type permit `capability`? */
export function facilityCan(type: FacilityType, capability: FacilityCapability): boolean {
  return FACILITY_CAPABILITIES[type][capability];
}

/** Is `scope` at least `required`? */
export function scopeAtLeast(scope: DataScope, required: DataScope): boolean {
  return DATA_SCOPES.indexOf(scope) >= DATA_SCOPES.indexOf(required);
}

/**
 * May a facility of this type hold an affiliation at `scope`?
 * Enforce on every write of ChildAffiliation.dataScope — this is the invariant that
 * keeps a nursery below the diagnosis line.
 */
export function scopeAllowedFor(type: FacilityType, scope: DataScope): boolean {
  return scopeAtLeast(FACILITY_CAPABILITIES[type].maxDataScope, scope);
}
