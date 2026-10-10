import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as adminApi from '@/lib/api/admin';

// ─── Dashboard ───────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getAdminStats,
  });
}

export function useCommunityStats() {
  return useQuery({
    queryKey: ['admin', 'community-stats'],
    queryFn: adminApi.getCommunityStats,
  });
}

export function useEngagementStats() {
  return useQuery({
    queryKey: ['admin', 'engagement-stats'],
    queryFn: adminApi.getEngagementStats,
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: ['admin', 'moderation-stats'],
    queryFn: adminApi.getModerationStats,
  });
}

export function useEngagementTrends() {
  return useQuery({
    queryKey: ['admin', 'engagement-trends'],
    queryFn: adminApi.getEngagementTrends,
  });
}

export function useUserDistribution() {
  return useQuery({
    queryKey: ['admin', 'user-distribution'],
    queryFn: adminApi.getUserDistribution,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['admin', 'recent-activity'],
    queryFn: adminApi.getRecentActivity,
  });
}

// ─── Users ───────────────────────────────────────────────────────

export function useAdminUsers(params?: { role?: string; status?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.getAdminUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.banUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ─── Content Moderation ──────────────────────────────────────────

export function useFlaggedContent(filter?: string) {
  return useQuery({
    queryKey: ['admin', 'flagged', filter],
    queryFn: () => adminApi.getFlaggedContent(filter),
  });
}

export function useModerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contentId,
      action,
      notes,
    }: {
      contentId: string;
      action: 'approve' | 'remove';
      notes: string;
    }) => adminApi.moderateContent(contentId, action, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flagged'] }),
  });
}

// ─── Verification ────────────────────────────────────────────────

export function useVerificationQueue(params?: {
  status?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'verification', params],
    queryFn: () => adminApi.getVerificationQueue(params),
  });
}

export function useVerificationStats() {
  return useQuery({
    queryKey: ['admin', 'verification-stats'],
    queryFn: adminApi.getVerificationStats,
  });
}

export function useVerifyUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      status,
      notes,
    }: {
      userId: string;
      status: 'VERIFIED' | 'REJECTED';
      notes: string;
    }) => adminApi.verifyUser(userId, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'verification'] });
      qc.invalidateQueries({ queryKey: ['admin', 'verification-stats'] });
    },
  });
}

// ─── Analytics ───────────────────────────────────────────────────

export function useAnalytics(range?: string) {
  return useQuery({
    queryKey: ['admin', 'analytics', range],
    queryFn: () => adminApi.getAnalytics(range),
  });
}

// ─── Organizations ───────────────────────────────────────────────

export function useOrganizations() {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: adminApi.getOrganizations,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      adminApi.createOrganization(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  });
}

// ─── Clinics ─────────────────────────────────────────────────────

export function useClinics() {
  return useQuery({
    queryKey: ['admin', 'clinics'],
    queryFn: adminApi.getClinics,
  });
}

export function useCreateClinic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
      adminEmail: string;
      organizationId: string;
    }) => adminApi.createClinic(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'clinics'] }),
  });
}

// ─── Clinic approvals ────────────────────────────────────────────

export function useClinicReviewQueue(status?: adminApi.ClinicComplianceStatus) {
  return useQuery({
    queryKey: ['admin', 'clinic-review', status ?? 'pending'],
    queryFn: () => adminApi.getClinicReviewQueue(status),
    placeholderData: keepPreviousData,
  });
}

export function useClinicReviewCounts(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'clinic-review-counts'],
    queryFn: adminApi.getClinicReviewCounts,
    enabled,
  });
}

export function useSetClinicCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      status: adminApi.ClinicReviewDecision;
      note?: string;
    }) => adminApi.setClinicCompliance(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'clinic-review'] });
      qc.invalidateQueries({ queryKey: ['admin', 'clinic-review-counts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'clinics'] });
    },
  });
}

// ─── Banner Ads ──────────────────────────────────────────────────

export function useBannerAds(params?: {
  page?: number;
  status?: string;
  placement?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['admin', 'banner-ads', params],
    queryFn: () => adminApi.getBannerAds(params),
  });
}

export function useCreateBannerAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createBannerAd,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'banner-ads'] }),
  });
}

export function useUpdateBannerAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<adminApi.BannerAd> & { id: string }) =>
      adminApi.updateBannerAd(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'banner-ads'] }),
  });
}

export function useDeleteBannerAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteBannerAd(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'banner-ads'] }),
  });
}

// ─── System Settings ─────────────────────────────────────────────

export function useSystemSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.getSystemSettings,
  });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<adminApi.SystemSettings>) =>
      adminApi.updateSystemSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });
}

export function useOnboardNursery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('@/lib/api/admin').OnboardNurseryPayload) =>
      adminApi.onboardNursery(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  });
}
