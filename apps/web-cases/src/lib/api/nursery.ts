import { apiClient } from '@upllyft/api-client';

// ── Types ──

export type FacilityType = 'CLINIC' | 'NURSERY' | 'SCHOOL';
export type LicenseAuthority = 'DHA' | 'DOH' | 'MOHAP' | 'KHDA' | 'ADEK' | 'MOE' | 'OTHER';
export type Emirate =
  | 'ABU_DHABI'
  | 'DUBAI'
  | 'SHARJAH'
  | 'AJMAN'
  | 'UMM_AL_QUWAIN'
  | 'RAS_AL_KHAIMAH'
  | 'FUJAIRAH';

export type FacilityRole =
  | 'OWNER'
  | 'ADMIN'
  | 'CLINICAL_LEAD'
  | 'THERAPIST'
  | 'INCLUSION_LEAD'
  | 'KEYWORKER'
  | 'RECEPTION'
  | 'BILLING';

export type AffiliationStatus = 'PENDING_CONSENT' | 'ACTIVE' | 'ENDED';
export type ClaimStatus = 'PENDING' | 'ACCEPTED' | 'DISPUTED' | 'EXPIRED' | 'REVOKED';

/**
 * What this facility may do, as the SERVER understands it. Shipped with the
 * facility rather than inferred from `type` on the client, so the UI can never
 * disagree with the API about whether a nursery can open a case — and if it did,
 * the API is the one that decides.
 */
export interface FacilityCapabilities {
  canCreateCase: boolean;
  canDiagnose: boolean;
  canWriteClinicalNotes: boolean;
  canScreen: boolean;
  canObserve: boolean;
  canRaiseConcern: boolean;
  canBill: boolean;
  maxDataScope: string;
}

export interface FacilitySummary {
  id: string;
  name: string;
  slug: string;
  type: FacilityType;
  complianceStatus: string;
  licenseAuthority: LicenseAuthority | null;
  emirate: Emirate | null;
  _count: { rooms: number; members: number };
}

export interface Room {
  id: string;
  name: string;
  ageBandLabel: string | null;
  _count?: { affiliations: number };
}

export interface Facility {
  id: string;
  name: string;
  slug: string;
  type: FacilityType;
  licenseNo: string | null;
  licenseAuthority: LicenseAuthority | null;
  emirate: Emirate | null;
  complianceStatus: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  organization: { id: string; name: string; slug: string; kind: string };
  rooms: Room[];
  capabilities: FacilityCapabilities;
}

export interface FacilityMember {
  id: string;
  role: FacilityRole;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  rooms: { id: string; name: string }[];
  _count: { keyworkerFor: number };
}

export interface RosterChild {
  childId: string;
  firstName: string;
  dateOfBirth: string;
  gender: string;
  affiliationId: string | null;
  affiliationStatus: AffiliationStatus | null;
  room: { id: string; name: string } | null;
  keyworker: { memberId: string; name: string | null } | null;
  /** false => the record is LOCKED. The nursery sees this row and nothing behind it. */
  consentGranted: boolean;
  /** A SEPARATE permission. Observing a child is not screening them. */
  screeningConsentGranted: boolean;
  guardian: { name: string; email: string | null; onPlatform: boolean } | null;
  claim: { id: string; status: ClaimStatus; expiresAt: string } | null;
}

// ── Facilities ──

export const listFacilities = (): Promise<FacilitySummary[]> =>
  apiClient.get('/facilities').then(r => r.data);

export const getFacility = (id: string): Promise<Facility> =>
  apiClient.get(`/facilities/${id}`).then(r => r.data);

export const createFacility = (data: {
  name: string;
  type: FacilityType;
  licenseNo?: string;
  licenseAuthority?: LicenseAuthority;
  emirate?: Emirate;
  address?: string;
  phone?: string;
  email?: string;
}): Promise<Facility> => apiClient.post('/facilities', data).then(r => r.data);

export const updateFacility = (id: string, data: Record<string, unknown>): Promise<Facility> =>
  apiClient.patch(`/facilities/${id}`, data).then(r => r.data);

// ── Rooms ──

export const listRooms = (facilityId: string): Promise<Room[]> =>
  apiClient.get(`/facilities/${facilityId}/rooms`).then(r => r.data);

export const createRoom = (
  facilityId: string,
  data: { name: string; ageBandLabel?: string },
): Promise<Room> => apiClient.post(`/facilities/${facilityId}/rooms`, data).then(r => r.data);

export const deleteRoom = (facilityId: string, roomId: string) =>
  apiClient.delete(`/facilities/${facilityId}/rooms/${roomId}`).then(r => r.data);

// ── Staff ──

export const listMembers = (facilityId: string): Promise<FacilityMember[]> =>
  apiClient.get(`/facilities/${facilityId}/members`).then(r => r.data);

export const addMember = (
  facilityId: string,
  data: { email: string; role: FacilityRole },
) => apiClient.post(`/facilities/${facilityId}/members`, data).then(r => r.data);

export const updateMember = (facilityId: string, memberId: string, role: FacilityRole) =>
  apiClient.patch(`/facilities/${facilityId}/members/${memberId}`, { role }).then(r => r.data);

export const removeMember = (facilityId: string, memberId: string) =>
  apiClient.delete(`/facilities/${facilityId}/members/${memberId}`).then(r => r.data);

// ── Roster ──

export const getRoster = (facilityId: string): Promise<RosterChild[]> =>
  apiClient.get(`/facilities/${facilityId}/roster`).then(r => r.data);

export const addRosterChild = (
  facilityId: string,
  data: {
    firstName: string;
    dateOfBirth: string;
    gender: string;
    roomId?: string;
    keyworkerId?: string;
    guardianName: string;
    guardianEmail: string;
    guardianPhone?: string;
    guardianRelationship?: string;
  },
): Promise<{ childId: string; affiliationId: string; claimSent: boolean }> =>
  apiClient.post(`/facilities/${facilityId}/roster`, data).then(r => r.data);

export const updatePlacement = (
  facilityId: string,
  affiliationId: string,
  data: { roomId?: string | null; keyworkerId?: string | null },
) => apiClient.patch(`/facilities/${facilityId}/roster/${affiliationId}`, data).then(r => r.data);

export const resendClaim = (facilityId: string, affiliationId: string) =>
  apiClient
    .post(`/facilities/${facilityId}/roster/${affiliationId}/resend-claim`, {})
    .then(r => r.data);

export const endEnrolment = (facilityId: string, affiliationId: string) =>
  apiClient.delete(`/facilities/${facilityId}/roster/${affiliationId}`).then(r => r.data);

export const requestScreeningConsent = (facilityId: string, affiliationId: string) =>
  apiClient
    .post(`/facilities/${facilityId}/roster/${affiliationId}/request-screening-consent`, {})
    .then(r => r.data);

// ── Screening (educator-administered) ──

export type AnswerType = 'YES' | 'SOMETIMES' | 'NOT_SURE' | 'NO' | 'NOT_OBSERVED';
export type DomainStatus = 'GREEN' | 'YELLOW' | 'RED' | 'INSUFFICIENT_DATA';

export interface ScreeningItem {
  id: string;
  question: string;
  whyWeAsk?: string;
  observableBy?: string[];
}

export interface ScreeningDomain {
  domainId: string;
  domainName: string;
  description?: string;
  questions: ScreeningItem[];
}

export interface Questionnaire {
  ageGroup: string;
  displayName: string;
  estimatedTime: string | number;
  informantType: 'PARENT' | 'EDUCATOR' | 'CLINICIAN';
  domains: ScreeningDomain[];
}

export const createScreening = (childId: string, ageGroup: string) =>
  apiClient.post('/assessments', { childId, ageGroup }).then(r => r.data);

export const getTier1 = (assessmentId: string): Promise<Questionnaire> =>
  apiClient.get(`/assessments/${assessmentId}/questionnaire/tier1`).then(r => r.data);

export const submitTier1 = (
  assessmentId: string,
  responses: { questionId: string; answer: AnswerType }[],
) => apiClient.post(`/assessments/${assessmentId}/responses/tier1`, { responses }).then(r => r.data);

// ── Concordance (the moat) ──

export type Concordance =
  | 'AGREE_CONCERN'
  | 'AGREE_TYPICAL'
  | 'EDUCATOR_ONLY'
  | 'PARENT_ONLY'
  | 'NOT_COMPARABLE';

export interface DomainConcordance {
  domainId: string;
  domainName: string;
  concordance: Concordance;
  parent: { riskIndex: number; status: DomainStatus } | null;
  educator: { riskIndex: number; status: DomainStatus } | null;
  delta: number | null;
  interpretation: string;
}

export interface ConcordanceResult {
  available: boolean;
  reason?: string;
  haveParent?: boolean;
  haveEducator?: boolean;
  gapDays?: number;
  parentScreening?: { id: string; completedAt: string; respondent: string | null };
  educatorScreening?: { id: string; completedAt: string; facility: string | null; respondent: string | null };
  domains: DomainConcordance[];
  summary?: {
    agreedConcern: string[];
    educatorOnly: string[];
    parentOnly: string[];
    notComparable: string[];
    headline: string;
  };
}

export const getConcordance = (childId: string): Promise<ConcordanceResult> =>
  apiClient.get(`/assessments/concordance/${childId}`).then(r => r.data);

// ── Observations (F5) ──

export type ObservationType = 'NOTE' | 'MOMENT' | 'MILESTONE' | 'CONCERN';

export const DEVELOPMENTAL_DOMAINS = [
  { id: 'grossMotor', label: 'Gross motor' },
  { id: 'fineMotor', label: 'Fine motor' },
  { id: 'speechLanguage', label: 'Speech & language' },
  { id: 'socialEmotional', label: 'Social & emotional' },
  { id: 'cognitiveLearning', label: 'Thinking & learning' },
  { id: 'adaptiveSelfCare', label: 'Self-care' },
  { id: 'sensoryProcessing', label: 'Sensory' },
  { id: 'visionHearing', label: 'Vision & hearing' },
] as const;

export interface Observation {
  id: string;
  note: string;
  domain: string | null;
  type: ObservationType;
  observedAt: string;
  createdAt: string;
  author: { id: string; name: string | null } | null;
}

export const listObservations = (
  facilityId: string,
  childId: string,
  params?: { domain?: string; type?: ObservationType },
): Promise<Observation[]> =>
  apiClient
    .get(`/facilities/${facilityId}/children/${childId}/observations`, { params })
    .then(r => r.data);

export const createObservation = (
  facilityId: string,
  childId: string,
  data: { note: string; domain?: string; type?: ObservationType; observedAt?: string },
): Promise<Observation> =>
  apiClient
    .post(`/facilities/${facilityId}/children/${childId}/observations`, data)
    .then(r => r.data);

export const deleteObservation = (facilityId: string, childId: string, observationId: string) =>
  apiClient
    .delete(`/facilities/${facilityId}/children/${childId}/observations/${observationId}`)
    .then(r => r.data);

// ── Concerns (F6 coached conversation) ──

export type ConcernStatus = 'DRAFT' | 'SHARED' | 'ACKNOWLEDGED' | 'CLOSED';

export interface Concern {
  id: string;
  status: ConcernStatus;
  domains: string[];
  staffCoaching: string | null;
  coachingModel: string | null;
  parentSummary: string;
  evidence: { concernObservations?: number; flaggedDomains?: string[]; bothSettingsAgree?: string[] } | null;
  sharedAt: string | null;
  acknowledgedAt: string | null;
  parentResponse: string | null;
  createdAt: string;
  raisedBy: { id: string; name: string | null } | null;
}

export const listConcerns = (facilityId: string, childId: string): Promise<Concern[]> =>
  apiClient.get(`/facilities/${facilityId}/children/${childId}/concerns`).then(r => r.data);

export const raiseConcern = (facilityId: string, childId: string, note?: string): Promise<Concern> =>
  apiClient.post(`/facilities/${facilityId}/children/${childId}/concerns`, { note }).then(r => r.data);

export const updateConcernSummary = (facilityId: string, childId: string, concernId: string, parentSummary: string): Promise<Concern> =>
  apiClient.patch(`/facilities/${facilityId}/children/${childId}/concerns/${concernId}`, { parentSummary }).then(r => r.data);

export const shareConcern = (facilityId: string, childId: string, concernId: string): Promise<Concern> =>
  apiClient.post(`/facilities/${facilityId}/children/${childId}/concerns/${concernId}/share`, {}).then(r => r.data);
