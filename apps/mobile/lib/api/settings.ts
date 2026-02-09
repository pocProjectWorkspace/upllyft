import api from '../api';

export interface UserPreferences {
  theme?: string;
  language?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  [key: string]: unknown;
}

export async function getPreferences(): Promise<UserPreferences> {
  const { data } = await api.get('/user/preferences');
  return data;
}

export async function updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const { data } = await api.post('/user/preferences', prefs);
  return data;
}

export async function resetPreferences(): Promise<void> {
  await api.put('/user/preferences/reset');
}
