import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

import api from '../lib/api';
import { getTokens, setTokens, clearTokens, getBiometricEnabled, setBiometricEnabled as storeBiometricEnabled } from '../lib/auth-store';
import { registerForPushNotifications, unregisterPushToken } from '../hooks/use-push-notifications';

export type UserRole = 'USER' | 'THERAPIST' | 'EDUCATOR' | 'ORGANIZATION' | 'ADMIN' | 'MODERATOR';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  image?: string;
  bio?: string;
  specialization?: string[];
  yearsOfExperience?: number;
  organization?: string;
  licenseNumber?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  licenseNumber?: string;
  specialization?: string[];
  yearsOfExperience?: number;
  organization?: string;
  bio?: string;
  captchaId?: string;
  captchaAnswer?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProfessional: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  authenticateWithBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PROFESSIONAL_ROLES: UserRole[] = ['THERAPIST', 'EDUCATOR', 'ORGANIZATION'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const biometricAvailableRef = useRef(false);

  const isProfessional = user ? PROFESSIONAL_ROLES.includes(user.role) : false;
  const isVerified = user?.verificationStatus === 'VERIFIED';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const isAuthenticated = !!user;

  const fetchProfile = useCallback(async () => {
    const { data } = await api.get('/auth/profile');
    setUser(data);
    return data as User;
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      // Check biometric hardware availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const bioAvailable = hasHardware && isEnrolled;
      setBiometricAvailable(bioAvailable);
      biometricAvailableRef.current = bioAvailable;

      const bioEnabled = await getBiometricEnabled();
      setBiometricEnabledState(bioEnabled);

      const { accessToken } = await getTokens();
      if (!accessToken) {
        setUser(null);
        return;
      }

      if (bioEnabled && bioAvailable) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Sign in to Upllyft',
          fallbackLabel: 'Use password',
          cancelLabel: 'Cancel',
        });
        if (!result.success) {
          // Biometric failed/cancelled — don't clear tokens, just show login screen
          setUser(null);
          return;
        }
      }

      await fetchProfile();
      // Re-register push token on app resume
      registerForPushNotifications().catch(() => {});
    } catch {
      setUser(null);
      await clearTokens();
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const promptBiometricEnable = useCallback(() => {
    Alert.alert(
      'Enable Biometric Login',
      'Would you like to use Face ID or fingerprint to sign in next time?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            await storeBiometricEnabled(true);
            setBiometricEnabledState(true);
          },
        },
      ],
    );
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post('/auth/login', { email, password });
      await setTokens(data.accessToken, data.refreshToken);
      const profile = await fetchProfile();

      // Register push notification token
      registerForPushNotifications().catch(() => {});

      router.replace('/(main)/(home)');

      // Prompt biometric enable after navigation
      if (biometricAvailableRef.current && !(await getBiometricEnabled())) {
        setTimeout(promptBiometricEnable, 500);
      }
    },
    [fetchProfile, promptBiometricEnable],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const res = await api.post('/auth/register', data);
      await setTokens(res.data.accessToken, res.data.refreshToken);
      const profile = await fetchProfile();

      // Register push notification token
      registerForPushNotifications().catch(() => {});

      if (PROFESSIONAL_ROLES.includes(profile.role)) {
        router.replace('/(main)/(home)');
      } else {
        router.replace('/(main)/(home)');
      }
    },
    [fetchProfile],
  );

  const authenticateWithBiometric = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Upllyft',
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      await fetchProfile();
      router.replace('/(main)/(home)');
    }
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    // Remove push token before clearing auth (needs auth header)
    await unregisterPushToken().catch(() => {});
    await clearTokens();
    setUser(null);
    router.replace('/(auth)/login');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isProfessional,
        isVerified,
        isAdmin,
        biometricAvailable,
        biometricEnabled,
        login,
        register,
        logout,
        checkAuth,
        authenticateWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
