import { apiClient } from '@upllyft/api-client';

export interface BannerAd {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl: string;
  placement: 'feed' | 'sidebar' | 'banner';
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export async function getActiveBannerAds(placement?: string): Promise<BannerAd[]> {
  const { data } = await apiClient.get<BannerAd[]>('/ads/banners', { params: { placement } });
  return data;
}

export async function trackAdImpression(adId: string): Promise<void> {
  await apiClient.post(`/ads/${adId}/impression`);
}

export async function trackAdClick(adId: string): Promise<void> {
  await apiClient.post(`/ads/${adId}/click`);
}
