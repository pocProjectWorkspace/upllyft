import api from '../api';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  type: string;
  category: string;
  tags: string[];
  createdAt: string;
}

export async function getResources(category?: string): Promise<Resource[]> {
  const { data } = await api.get('/resources', { params: category ? { category } : {} });
  return Array.isArray(data) ? data : data.resources ?? [];
}

export async function getResourceCategories(): Promise<string[]> {
  const { data } = await api.get('/resources/categories');
  return Array.isArray(data) ? data : [];
}
