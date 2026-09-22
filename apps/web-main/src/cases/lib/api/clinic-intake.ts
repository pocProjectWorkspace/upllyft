import { apiClient } from '@upllyft/api-client';

export type IdentityDocType = 'EMIRATES_ID' | 'PASSPORT' | 'BIRTH_CERTIFICATE' | 'OTHER';
export type GuardianRelationship = 'MOTHER' | 'FATHER' | 'LEGAL_GUARDIAN' | 'GRANDPARENT' | 'SIBLING' | 'OTHER';
export type GuardianAccessLevel = 'FULL' | 'LIMITED' | 'VIEW_ONLY' | 'NONE';

export interface IdentityStatus {
  identityType?: IdentityDocType | null;
  emiratesIdMasked?: string | null;
  emiratesIdExpiry?: string | null;
  passportMasked?: string | null;
  identityVerified: boolean;
  identityVerifiedAt?: string | null;
}

export interface Guardian {
  id: string;
  childId: string;
  fullName: string;
  relationship: GuardianRelationship;
  hasAuthorityToConsent: boolean;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  phone?: string | null;
  email?: string | null;
  accessLevel: GuardianAccessLevel;
}

export interface CaptureIdentityInput {
  identityType: IdentityDocType;
  emiratesId?: string;
  emiratesIdExpiry?: string;
  passportNumber?: string;
  documentFileUrl?: string;
}

// ── Identity ──
export async function getIdentity(childId: string): Promise<IdentityStatus> {
  const res = await apiClient.get(`/children/${childId}/identity`);
  return res.data;
}
export async function captureIdentity(childId: string, data: CaptureIdentityInput): Promise<IdentityStatus> {
  const res = await apiClient.put(`/children/${childId}/identity`, data);
  return res.data;
}
export async function verifyIdentity(childId: string): Promise<IdentityStatus> {
  const res = await apiClient.post(`/children/${childId}/identity/verify`, {});
  return res.data;
}

// ── Guardians ──
export async function listGuardians(childId: string): Promise<Guardian[]> {
  const res = await apiClient.get(`/children/${childId}/guardians`);
  return res.data;
}
export async function createGuardian(childId: string, data: Partial<Guardian>): Promise<Guardian> {
  const res = await apiClient.post(`/children/${childId}/guardians`, data);
  return res.data;
}
export async function updateGuardian(childId: string, guardianId: string, data: Partial<Guardian>): Promise<Guardian> {
  const res = await apiClient.put(`/children/${childId}/guardians/${guardianId}`, data);
  return res.data;
}
export async function removeGuardian(childId: string, guardianId: string): Promise<{ success: boolean }> {
  const res = await apiClient.delete(`/children/${childId}/guardians/${guardianId}`);
  return res.data;
}
