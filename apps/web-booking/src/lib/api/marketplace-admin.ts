import { apiClient } from '@upllyft/api-client';

// ── Types ──

export interface PlatformSettings {
  platformCommissionPercentage: number;
  escrowHoldHours: number;
  enableMarketplace: boolean;
  stripePlatformAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePlatformSettingsDto {
  platformCommissionPercentage?: number;
  escrowHoldHours?: number;
  enableMarketplace?: boolean;
}

export interface TherapistCommission {
  id: string;
  name: string;
  email: string;
  image?: string;
  customCommission?: number;
  effectiveCommission: number;
  totalBookings: number;
  totalRevenue: number;
}

// ── API Functions ──

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const res = await apiClient.get('/marketplace/admin/settings');
  return res.data;
}

export async function updatePlatformSettings(data: UpdatePlatformSettingsDto): Promise<PlatformSettings> {
  const res = await apiClient.patch('/marketplace/admin/settings', data);
  return res.data;
}

export async function getTherapistsWithCommission(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ therapists: TherapistCommission[]; total: number }> {
  const res = await apiClient.get('/marketplace/admin/therapists', { params });
  return res.data;
}

export async function updateTherapistCommission(
  therapistId: string,
  commissionPercentage: number,
): Promise<void> {
  await apiClient.patch(`/marketplace/admin/therapists/${therapistId}/commission`, {
    commissionPercentage,
  });
}
