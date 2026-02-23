import { apiClient } from '@upllyft/api-client';
import { BannerAd } from './admin';

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
