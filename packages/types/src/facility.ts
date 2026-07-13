/**
 * Facility capabilities — config, not branches.
 *
 * What a facility may DO is derived from its TYPE, in one map, checked by one
 * guard. The alternative — `if (facility.type === 'NURSERY')` sprinkled through
 * services — is exactly the antipattern `region.ts` was written to avoid, and it
 * is how a nursery eventually ends up able to record a diagnosis because someone
 * forgot a check on one endpoint.
 *
 * See docs/tenancy-and-multi-setting-model.md.
 */

export type FacilityType = 'CLINIC' | 'NURSERY' | 'SCHOOL';

export type OrgKind =
  | 'CLINIC_GROUP'
  | 'NURSERY_GROUP'
  | 'SCHOOL_GROUP'
  | 'NGO'
  | 'PLATFORM';

export type LicenseAuthority =
  | 'DHA'
  | 'DOH'
  | 'MOHAP'
  | 'KHDA'
  | 'ADEK'
  | 'MOE'
  | 'OTHER';

/**
 * What a facility may SEE about an affiliated child. Ordered least → most;
 * the index is the comparison key, so never reorder without updating callers.
 */
export const DATA_SCOPES = [
  'OBSERVATIONS_ONLY',
  'SCREENING_SHARED',
  'CLINICAL_SUMMARY',
  'FULL_CLINICAL',
] as const;

export type DataScope = (typeof DATA_SCOPES)[number];

export interface FacilityCapabilities {
  /** May open a clinical Case. */
  canCreateCase: boolean;
  /** May record a diagnosis. Additionally gated per-user by TherapistProfile.canDiagnose. */
  canDiagnose: boolean;
  /** May author clinical/session notes. */
  canWriteClinicalNotes: boolean;
  /** May administer a developmental screening. */
  canScreen: boolean;
  /** May record day-to-day developmental observations. */
  canObserve: boolean;
  /** May raise a concern that starts the flag → conversation → referral pathway. */
  canRaiseConcern: boolean;
  /** May invoice / take payment. */
  canBill: boolean;
  /** Ceiling on any affiliation's dataScope at this facility. */
  maxDataScope: DataScope;
  /** Licence authorities valid for this facility type. */
  validAuthorities: readonly LicenseAuthority[];
}

const HEALTH_AUTHORITIES = ['DHA', 'DOH', 'MOHAP', 'OTHER'] as const;
const EDUCATION_AUTHORITIES = ['KHDA', 'ADEK', 'MOE', 'OTHER'] as const;

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
    validAuthorities: HEALTH_AUTHORITIES,
  },

  // A nursery observes and screens. It never treats, never diagnoses, never
  // writes a clinical note, and can never see beyond CLINICAL_SUMMARY — so a
  // diagnosis is unreachable from a nursery by construction, not by convention.
  NURSERY: {
    canCreateCase: false,
    canDiagnose: false,
    canWriteClinicalNotes: false,
    canScreen: true,
    canObserve: true,
    canRaiseConcern: true,
    canBill: false,
    maxDataScope: 'CLINICAL_SUMMARY',
    validAuthorities: EDUCATION_AUTHORITIES,
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
    validAuthorities: EDUCATION_AUTHORITIES,
  },
};

export type FacilityCapability = keyof Omit<
  FacilityCapabilities,
  'maxDataScope' | 'validAuthorities'
>;

/** Does this facility type permit `capability`? */
export function facilityCan(type: FacilityType, capability: FacilityCapability): boolean {
  return FACILITY_CAPABILITIES[type][capability];
}

/** Is `scope` at least `required`? (Ordering comes from DATA_SCOPES.) */
export function scopeAtLeast(scope: DataScope, required: DataScope): boolean {
  return DATA_SCOPES.indexOf(scope) >= DATA_SCOPES.indexOf(required);
}

/**
 * May a facility of this type hold an affiliation at `scope`?
 * Enforce on every write of ChildAffiliation.dataScope — this is the invariant
 * that keeps a nursery below the diagnosis line.
 */
export function scopeAllowedFor(type: FacilityType, scope: DataScope): boolean {
  return scopeAtLeast(FACILITY_CAPABILITIES[type].maxDataScope, scope);
}

/** Is this licence authority valid for this facility type? A nursery is never DHA-licensed. */
export function authorityValidFor(type: FacilityType, authority: LicenseAuthority): boolean {
  return FACILITY_CAPABILITIES[type].validAuthorities.includes(authority);
}

/** The dataScope a new affiliation should default to at this facility type. */
export function defaultScopeFor(type: FacilityType): DataScope {
  return type === 'CLINIC' ? 'FULL_CLINICAL' : 'OBSERVATIONS_ONLY';
}
