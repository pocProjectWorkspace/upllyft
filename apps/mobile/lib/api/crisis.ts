import api from '../api';
import { CrisisResource } from '../types/crisis';

export async function getCrisisResources(country?: string): Promise<CrisisResource[]> {
  const { data } = await api.get('/crisis/resources', { params: country ? { country } : {} });
  return Array.isArray(data) ? data : data.resources ?? [];
}
