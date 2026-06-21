import { apiClient } from '@upllyft/api-client';

// ── Types (mirror the Phase 2 backend) ──
export type PayerType =
  | 'SELF_PAY'
  | 'INSURANCE'
  | 'EMPLOYER'
  | 'SCHOOL_SPONSOR'
  | 'NGO_SPONSOR'
  | 'OTHER_THIRD_PARTY';

export type PreAuthStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export type FinancialClearanceStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'CLEARED'
  | 'EXCEPTION_APPROVED'
  | 'BLOCKED';

export interface PreAuthorization {
  id: string;
  policyId: string;
  caseId?: string | null;
  serviceCode?: string | null;
  preAuthNumber?: string | null;
  status: PreAuthStatus;
  approvedSessions?: number | null;
  usedSessions: number;
  validFrom?: string | null;
  validUntil?: string | null;
  denialReason?: string | null;
  createdAt: string;
  policy?: InsurancePolicy;
}

export interface InsurancePolicy {
  id: string;
  childId: string;
  payerType: PayerType;
  insurerName?: string | null;
  sponsorName?: string | null;
  policyNumber?: string | null;
  memberId?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  coPayPercent?: number | null;
  isActive: boolean;
  preAuthorizations?: PreAuthorization[];
  createdAt: string;
}

export interface BookingReadiness {
  bookingId: string;
  ready: boolean;
  financialClearance: FinancialClearanceStatus;
  paymentRoute: PayerType;
  paymentStatus: string;
  blockers: string[];
}

// ── Insurance policies (child-scoped) ──
export async function listInsurancePolicies(childId: string): Promise<InsurancePolicy[]> {
  const res = await apiClient.get(`/children/${childId}/insurance-policies`);
  return res.data;
}

export async function createInsurancePolicy(
  childId: string,
  data: Partial<InsurancePolicy>,
): Promise<InsurancePolicy> {
  const res = await apiClient.post(`/children/${childId}/insurance-policies`, data);
  return res.data;
}

export async function updateInsurancePolicy(
  childId: string,
  policyId: string,
  data: Partial<InsurancePolicy>,
): Promise<InsurancePolicy> {
  const res = await apiClient.patch(`/children/${childId}/insurance-policies/${policyId}`, data);
  return res.data;
}

// ── Pre-authorizations ──
export interface CreatePreAuthInput {
  policyId: string;
  caseId?: string;
  serviceCode?: string;
  preAuthNumber?: string;
  approvedSessions?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface DecidePreAuthInput {
  status: PreAuthStatus;
  preAuthNumber?: string;
  approvedSessions?: number;
  validUntil?: string;
  denialReason?: string;
}

export async function listPreAuths(caseId: string): Promise<PreAuthorization[]> {
  const res = await apiClient.get('/pre-authorizations', { params: { caseId } });
  return res.data;
}

export async function createPreAuth(data: CreatePreAuthInput): Promise<PreAuthorization> {
  const res = await apiClient.post('/pre-authorizations', data);
  return res.data;
}

export async function decidePreAuth(id: string, data: DecidePreAuthInput): Promise<PreAuthorization> {
  const res = await apiClient.patch(`/pre-authorizations/${id}/decision`, data);
  return res.data;
}

export async function renewPreAuth(
  id: string,
  data: { approvedSessions?: number; validFrom?: string; validUntil?: string; preAuthNumber?: string },
): Promise<PreAuthorization> {
  const res = await apiClient.post(`/pre-authorizations/${id}/renew`, data);
  return res.data;
}

// ── Booking readiness / clearance ──
export async function getBookingReadiness(bookingId: string): Promise<BookingReadiness> {
  const res = await apiClient.get(`/bookings/${bookingId}/readiness`);
  return res.data;
}

export async function setBookingClearance(
  bookingId: string,
  data: { status: FinancialClearanceStatus; note?: string },
) {
  const res = await apiClient.patch(`/bookings/${bookingId}/clearance`, data);
  return res.data;
}
