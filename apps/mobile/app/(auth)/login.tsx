import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/auth-context';
import api from '../../lib/api';
import { setTokens } from '../../lib/auth-store';
import { COLORS, API_URL, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, OAUTH_CALLBACK_URL } from '../../lib/constants';
import FormInput from '../../components/FormInput';
import GradientButton from '../../components/GradientButton';
import GoogleSignInButton from '../../components/GoogleSignInButton';

WebBrowser.maybeCompleteAuthSession();

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

// Only use expo-auth-session when we have a proper iOS client ID
const HAS_IOS_CLIENT_ID = !!GOOGLE_IOS_CLIENT_ID;

function useGoogleAuth() {
  if (HAS_IOS_CLIENT_ID) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return Google.useAuthRequest({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    });
  }
  return [null, null, null] as const;
}

export default function LoginScreen() {
  const { login, checkAuth, biometricAvailable, biometricEnabled, authenticateWithBiometric } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = useGoogleAuth();

  useEffect(() => {
    if (response && 'type' in response && response.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleToken(id_token);
      }
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const { data } = await api.post('/auth/google/mobile', { idToken });
      if (data.accessToken && data.refreshToken) {
        await setTokens(data.accessToken, data.refreshToken);
        await checkAuth();
        router.replace('/(main)/(home)');
      }
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Invalid email or password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      if (promptAsync) {
        // Use expo-auth-session (has iOS client ID)
        await promptAsync();
      } else {
        // Fallback: open web-based Google OAuth
        const callbackUrl = encodeURIComponent(OAUTH_CALLBACK_URL);
        const url = `${API_URL}/api/auth/google?state=mobile:${callbackUrl}`;
        await WebBrowser.openAuthSessionAsync(url, OAUTH_CALLBACK_URL);
      }
    } catch {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={[COLORS.mint, COLORS.teal]}
        style={styles.header}
      >
        <Text style={styles.brand}>Upllyft</Text>
        <Text style={styles.subtitle}>Welcome back</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Email"
                  icon="mail-outline"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  isPassword
                  autoComplete="password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <GradientButton
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton onPress={handleGoogleSignIn} loading={googleLoading} />

            {biometricAvailable && biometricEnabled && (
              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={authenticateWithBiometric}
                activeOpacity={0.7}
              >
                <View style={styles.biometricIcon}>
                  <Ionicons name="finger-print" size={28} color={COLORS.teal} />
                </View>
                <Text style={styles.biometricText}>Sign in with biometrics</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Create Account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 64,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    marginTop: 4,
    opacity: 0.9,
  },
  formWrapper: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  card: {
    padding: 24,
  },
  errorBanner: {
    backgroundColor: COLORS.errorBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  biometricBtn: {
    alignItems: 'center',
    marginTop: 20,
  },
  biometricIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  biometricText: {
    fontSize: 13,
    color: COLORS.teal,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  link: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '600',
  },
});
