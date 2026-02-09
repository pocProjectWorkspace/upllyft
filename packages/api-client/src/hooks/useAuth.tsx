'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  baseURL?: string;
}

export function AuthProvider({ children, baseURL }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (baseURL) {
      initializeApiClient(baseURL);
    }

    const initAuth = async () => {
      const { accessToken, refreshToken } = getStoredTokens();

      // Hydrate in-memory state from localStorage (cross-port sharing)
      if (accessToken) {
        setAuthToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);

        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          setIsLoading(false);
          return;
        } catch {
          // Token expired — try refresh below
        }
      }

      // Attempt token refresh
      if (refreshToken) {
        try {
          await authApi.refreshToken(refreshToken);
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          setIsLoading(false);
          return;
        } catch {
          clearStoredTokens();
        }
      }

      setUser(null);
      setIsLoading(false);
    };

    initAuth();
  }, [baseURL]);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await authApi.login({ email, password });
    setUser(user);
  }, []);

  const register = useCallback(async (payload: authApi.RegisterPayload) => {
    const { user } = await authApi.register(payload);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
