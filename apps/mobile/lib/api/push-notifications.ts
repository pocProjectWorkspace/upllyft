import api from '../api';

export async function registerPushToken(token: string, platform: 'ios' | 'android') {
  await api.put('/notifications/token', { token, platform });
}

export async function removePushToken(token: string) {
  await api.delete('/notifications/token', { data: { token } });
}
