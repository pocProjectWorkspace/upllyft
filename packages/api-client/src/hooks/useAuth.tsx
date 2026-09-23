'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@upllyft/types';
import {
  initializeApiClient,
  setAuthToken,
  setRefreshToken,
  getStoredTokens,
  clearStoredTokens,
} from '../client';
import * as authApi from '../auth';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True while a background revalidation of the cached user is in flight. */
  isRevalidating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  baseURL?: string;
  /**
   * A promise started on the server (root layout reads the auth cookie and
   * calls /auth/me there) and streamed to the client. When it resolves with
   * a user we adopt it and skip the client-side /auth/me round trip; when it
   * resolves null (no cookie, API slow, token rejected) we fall back to the
   * normal client flow. It must never reject.
   */
  serverUser?: Promise<User | null> | null;
}

/* ------------------------------------------------------------------ */
/*  Cached user snapshot (stale-while-revalidate across page loads)    */
/* ------------------------------------------------------------------ */

const USER_CACHE_KEY = 'upllyft_user';
const USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedUser {
  user: User;
  savedAt: number;
}

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUser;
    if (!parsed?.user?.id || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > USER_CACHE_TTL_MS) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, savedAt: Date.now() } satisfies CachedUser));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

/** Decode a JWT's `exp` claim without verifying it. Returns true when expired or undecodable. */
function isJwtExpired(token: string, skewSeconds = 30): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json.exp !== 'number') return false;
    return json.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

/* ------------------------------------------------------------------ */

export function AuthProvider({ children, baseURL, serverUser }: AuthProviderProps) {
  // Initial state must match the server-rendered HTML (no user), so the
  // snapshot is applied in a layout effect right after mount — before the
  // browser paints — rather than in the state initializer. Returning users
  // therefore still see the authenticated shell on first paint without any
  // network round trip, and there is no hydration mismatch.
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const initialized = useRef(false);
  const snapshotRef = useRef<User | null>(null);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    writeCachedUser(next);
  }, []);

  useLayoutEffect(() => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken && !refreshToken) return;
    const cached = readCachedUser();
    if (cached) {
      snapshotRef.current = cached;
      setUserState(cached);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (baseURL) {
      initializeApiClient(baseURL);
    }

    const initAuth = async () => {
      const { accessToken, refreshToken } = getStoredTokens();

      // Hydrate in-memory token state immediately (sync)
      if (accessToken) setAuthToken(accessToken);
      if (refreshToken) setRefreshToken(refreshToken);

      // No tokens at all — not authenticated
      if (!accessToken && !refreshToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const hadSnapshot = snapshotRef.current !== null;
      if (hadSnapshot) setIsRevalidating(true);

      // If the access token is already expired, skip the /auth/me call that
      // would 401 and go straight to refresh (saves one round trip).
      const accessUsable = !!accessToken && !isJwtExpired(accessToken);

      if (accessUsable && serverUser) {
        // The server already asked /auth/me with this cookie; its answer
        // arrives in the same HTML stream, so waiting costs no extra request.
        const fromServer = await serverUser.catch(() => null);
        if (fromServer) {
          setUser(fromServer);
          setIsLoading(false);
          setIsRevalidating(false);
          return;
        }
      }

      if (accessUsable) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          setIsLoading(false);
          setIsRevalidating(false);
          return;
        } catch {
          // Token rejected — fall through to refresh
        }
      }

      if (refreshToken) {
        try {
          await authApi.refreshToken(refreshToken);
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          setIsLoading(false);
          setIsRevalidating(false);
          return;
        } catch {
          clearStoredTokens();
        }
      }

      setUser(null);
      setIsLoading(false);
      setIsRevalidating(false);
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseURL, serverUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await authApi.login({ email, password });
    setUser(user);
  }, [setUser]);

  const register = useCallback(async (payload: authApi.RegisterPayload) => {
    const { user } = await authApi.register(payload);
    setUser(user);
  }, [setUser]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, [setUser]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch {
      // If refresh fails, don't clear user — caller can handle
    }
  }, [setUser]);

  // Apply a per-origin theme marker to <html> so CSS can skin the
  // app differently for users provisioned via external SSO partners.
  // Currently used by web-community and web-screening to render an
  // OneVoice-branded (blue/green) theme instead of the default
  // pink/teal theme.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const source = user?.ssoSource;
    if (source) {
      root.dataset.theme = source;
    } else if (root.dataset.theme) {
      delete root.dataset.theme;
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isRevalidating,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, isRevalidating, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
