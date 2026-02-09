import api from '../api';

export type BannerAd = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: string;
  priority: number;
};

export async function getActiveBannerAds(placement: string): Promise<BannerAd[]> {
  const { data } = await api.get<BannerAd[]>(`/banner-ads/active/${placement}`);
  return data;
}

export async function trackAdImpression(id: string): Promise<void> {
  await api.post(`/banner-ads/${id}/impression`);
}

export async function trackAdClick(id: string): Promise<void> {
  await api.post(`/banner-ads/${id}/click`);
}
