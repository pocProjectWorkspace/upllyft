import { apiClient } from '@upllyft/api-client';

export interface Credential {
  id: string;
  therapistId: string;
  label: string;
  fileUrl: string;
  mimeType: string;
  fileName: string;
  expiresAt: string | null;
  uploadedBy: string;
  createdAt: string;
}

export async function getTherapistCredentials(
  therapistId: string,
): Promise<Credential[]> {
  const { data } = await apiClient.get(
    `/api/admin/therapists/${therapistId}/credentials`,
  );
  return data;
}

export async function uploadCredential(
  therapistId: string,
  formData: FormData,
): Promise<Credential> {
  const { data } = await apiClient.post(
    `/api/admin/therapists/${therapistId}/credentials`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function getCredentialDownloadUrl(
  therapistId: string,
  credId: string,
): Promise<{ url: string; expiresIn: number }> {
  const { data } = await apiClient.get(
    `/api/admin/therapists/${therapistId}/credentials/${credId}/download`,
  );
  return data;
}

export async function deleteCredential(
  therapistId: string,
  credId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/admin/therapists/${therapistId}/credentials/${credId}`,
  );
}
