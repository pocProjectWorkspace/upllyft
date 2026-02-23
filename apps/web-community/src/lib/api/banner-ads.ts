import { apiClient } from '@upllyft/api-client';

export interface BannerAd {
    id: string;
    title: string;
    imageUrl: string;
    targetUrl: string;
    placement: 'FEED' | 'SIDEBAR' | 'BANNER_TOP' | 'BANNER_BOTTOM';
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
    startDate: string | null;
    endDate: string | null;
    priority: number;
    impressions?: number;
    clicks?: number;
    createdAt: string;
    updatedAt: string;
}

export async function getActiveBannerAds(placement: 'FEED' | 'BANNER_TOP'): Promise<BannerAd[]> {
    const { data } = await apiClient.get<BannerAd[]>(`banner-ads/active/${placement}`);
    return data;
}

export async function trackBannerAdImpression(id: string): Promise<void> {
    await apiClient.post(`/banner-ads/${id}/impression`);
}

export async function trackBannerAdClick(id: string): Promise<void> {
    await apiClient.post(`/banner-ads/${id}/click`);
}
