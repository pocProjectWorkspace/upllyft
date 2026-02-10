import axios, { type AxiosInstance } from 'axios';

const TOKEN_KEY = 'upllyft_access_token';
const REFRESH_KEY = 'upllyft_refresh_token';

// Cookie helpers for cross-port token sharing in development.
// localStorage is per-origin (port-specific), but cookies on localhost
// are shared across all ports, enabling seamless cross-app auth.
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

let apiClient: AxiosInstance = createClient('/api');
let storedRefreshToken: string | null = null;

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: attach auth token from storage before every request.
  // This handles the race condition where queries fire before AuthProvider
  // has called setAuthToken (e.g. React Query hooks mount before parent effects).
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined' && !config.headers['Authorization']) {
      const token = getCookie(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  });

  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];

  const processQueue = (error: unknown | null) => {
    failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(undefined);
      }
    });
    failedQueue = [];
  };

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (!storedRefreshToken && typeof window !== 'undefined') {
          storedRefreshToken = getCookie(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY);
        }
        if (!storedRefreshToken) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => client(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await client.post('/auth/refresh', {
            refreshToken: storedRefreshToken,
          });
          setAuthToken(data.accessToken);
          if (data.refreshToken) {
            storedRefreshToken = data.refreshToken;
          }
          processQueue(null);
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          clearStoredTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export function initializeApiClient(baseURL: string) {
  apiClient.defaults.baseURL = baseURL;
}

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      setCookie(TOKEN_KEY, token);
    }
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      deleteCookie(TOKEN_KEY);
    }
  }
}

export function setRefreshToken(token: string | null) {
  storedRefreshToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(REFRESH_KEY, token);
      setCookie(REFRESH_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_KEY);
      deleteCookie(REFRESH_KEY);
    }
  }
}

export function getStoredTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null };
  }
  // Check cookies first (shared across ports), then localStorage
  return {
    accessToken: getCookie(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY),
    refreshToken: getCookie(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY),
  };
}

export function clearStoredTokens() {
  storedRefreshToken = null;
  delete apiClient.defaults.headers.common['Authorization'];
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    deleteCookie(TOKEN_KEY);
    deleteCookie(REFRESH_KEY);
  }
}

export { apiClient };
