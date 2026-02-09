export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const COLORS = {
  mint: '#3ECFB4',
  teal: '#0D9488',
  tealDark: '#0F766E',
  white: '#FFFFFF',
  background: '#F8FFFE',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  inputBg: '#F9FAFB',
} as const;

export const OAUTH_CALLBACK_URL = 'upllyft://callback';

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '6352500607-ql50inssa68cu5doos7ojcosba8i8dc3.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
