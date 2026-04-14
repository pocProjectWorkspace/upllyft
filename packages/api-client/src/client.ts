import axios, { type AxiosInstance } from 'axios';

const TOKEN_KEY = 'upllyft_access_token';
const REFRESH_KEY = 'upllyft_refresh_token';

// Cookie helpers for cross-app token sharing.
// In development, cookies on localhost are shared across all ports.
// In production, cookies are scoped to .safehaven-upllyft.com so all
// subdomains (app., community., screening., etc.) share authentication.
function getCookieDomain(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  // Match any subdomain of safehaven-upllyft.com
  if (hostname === 'safehaven-upllyft.com' || hostname.endsWith('.safehaven-upllyft.com')) {
    return '; domain=.safehaven-upllyft.com';
  }
  // Match any subdomain of upllyft.com
  if (hostname === 'upllyft.com' || hostname.endsWith('.upllyft.com')) {
    return '; domain=.upllyft.com';
  }
  return '';
}

function setCookie(name: string, value: string) {
  const domain = getCookieDomain();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${domain}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Delete a cookie. Browsers only delete a cookie when the deletion
 * directive matches the original cookie's domain + path scope, so we
 * issue THREE delete attempts to cover any historic scope:
 *
 *   1. Host-scoped (no domain) — for cookies set on localhost or before
 *      we added the cross-subdomain domain logic.
 *   2. Parent-domain-scoped (.safehaven-upllyft.com / .upllyft.com).
 *   3. Current hostname explicitly — defensive coverage.
 *
 * Without this, a stale host-scoped cookie keeps the user "logged in"
 * client-side even after a clean Sign Out.
 */
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const domain = getCookieDomain();
  // 1. Host-scoped (no domain attribute)
  document.cookie = `${name}=; path=/; ${expires}`;
  // 2. Parent-domain-scoped if applicable
  if (domain) {
    document.cookie = `${name}=; path=/; ${expires}${domain}`;
  }
  // 3. Explicit current hostname
  if (typeof window !== 'undefined') {
    document.cookie = `${name}=; path=/; ${expires}; domain=${window.location.hostname}`;
  }
}

const defaultBaseURL = typeof window !== 'undefined' ? '/api' : 'https://upllyftapi-production.up.railway.app/api';
let apiClient: AxiosInstance = createClient(defaultBaseURL);
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
  //
  // Cross-subdomain logout safety: if there's no cookie (shared across
  // subdomains) we MUST ignore localStorage (per-origin) because that
  // means a sibling subdomain logged the user out. Without this, the
  // interceptor would keep sending a stale token from the local origin
  // even after a clean Sign Out from a sibling app.
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined' && !config.headers['Authorization']) {
      const cookieToken = getCookie(TOKEN_KEY);
      const localToken = localStorage.getItem(TOKEN_KEY);
      // Only fall back to localStorage if cookies are also present
      // (proving the user hasn't been logged out from a sibling origin).
      const cookieRefresh = getCookie(REFRESH_KEY);
      const token = cookieToken || (cookieRefresh ? localToken : null);
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

      // Skip refresh logic if the failing request IS the refresh endpoint itself
      const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

      if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
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
          // Don't hard-redirect here — useRequireAuth handles the
          // redirect via React router. A window.location.href reload
          // causes an infinite loop because each reload re-initialises
          // the module, finds stale tokens, and repeats.
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

  const cookieAccess = getCookie(TOKEN_KEY);
  const cookieRefresh = getCookie(REFRESH_KEY);
  const localAccess = localStorage.getItem(TOKEN_KEY);
  const localRefresh = localStorage.getItem(REFRESH_KEY);

  // CROSS-SUBDOMAIN LOGOUT SAFETY:
  // Cookies are scoped to .safehaven-upllyft.com and therefore shared
  // across all subdomains. localStorage, however, is origin-scoped, so
  // clearing it on one subdomain (e.g. community) leaves a stale copy on
  // every sibling subdomain (e.g. app, screening, booking).
  //
  // If BOTH cookies are absent but localStorage still has values, we're
  // looking at that stale sibling-subdomain state — the user logged out
  // somewhere else. Nuke localStorage and return empty so the user is
  // treated as logged out everywhere.
  if (!cookieAccess && !cookieRefresh && (localAccess || localRefresh)) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {}
    return { accessToken: null, refreshToken: null };
  }

  // Cookies are source of truth; localStorage is a per-origin mirror
  // kept for SSR hydration and offline reads.
  return {
    accessToken: cookieAccess || localAccess,
    refreshToken: cookieRefresh || localRefresh,
  };
}

/**
 * Wipe every trace of authenticated state from this browser. Called by
 * logout and by the response interceptor when token refresh fails.
 *
 * Clears, in order:
 *   1. The in-memory `storedRefreshToken` module variable
 *   2. The Axios default Authorization header
 *   3. localStorage for both access and refresh tokens
 *   4. Cookies for access + refresh tokens (host scope, parent-domain scope)
 *   5. The captcha challenge cookie so a stale captcha can't bleed across
 *      sessions
 *
 * After this returns, getStoredTokens() must yield { null, null }.
 */
export function clearStoredTokens() {
  storedRefreshToken = null;
  delete apiClient.defaults.headers.common['Authorization'];
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    deleteCookie(TOKEN_KEY);
    deleteCookie(REFRESH_KEY);
    // Captcha challenge — wipe so a stale captcha can't survive logout
    deleteCookie('captcha_token');
  }
}

export { apiClient };
