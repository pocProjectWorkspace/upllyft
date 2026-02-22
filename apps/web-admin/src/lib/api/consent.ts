import { apiClient } from '@upllyft/api-client';

export interface ConsentForm {
  id: string;
  patientId: string;
  intakeId: string;
  envelopeId: string | null;
  status: 'PENDING' | 'SENT' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
  sentAt: string | null;
  signedAt: string | null;
  documentUrl: string | null;
  sentBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendConsentPayload {
  patientId: string;
  intakeId: string;
  patientName: string;
  parentName: string;
  parentEmail: string;
}

export async function getPatientConsents(
  patientId: string,
): Promise<ConsentForm[]> {
  const { data } = await apiClient.get(
    `/api/consent/patient/${patientId}`,
  );
  return data;
}

export async function sendConsentForm(
  payload: SendConsentPayload,
): Promise<ConsentForm> {
  const { data } = await apiClient.post('/api/consent/send', payload);
  return data;
}
