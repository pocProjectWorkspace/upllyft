import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth, RegisterData, UserRole } from '../../contexts/auth-context';
import api from '../../lib/api';
import { API_URL, COLORS } from '../../lib/constants';
import FormInput from '../../components/FormInput';
import GradientButton from '../../components/GradientButton';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    captchaAnswer: z.string().min(1, 'Captcha is required'),
    role: z.enum(['THERAPIST', 'EDUCATOR', 'ORGANIZATION']).optional(),
    licenseNumber: z.string().optional(),
    yearsOfExperience: z.string().optional(),
    organization: z.string().optional(),
    specializations: z.string().optional(),
    bio: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Therapist', value: 'THERAPIST' },
  { label: 'Educator', value: 'EDUCATOR' },
  { label: 'Organization', value: 'ORGANIZATION' },
];

export default function SignupScreen() {
  const { register: registerUser } = useAuth();
  const [tab, setTab] = useState<'individual' | 'professional'>('individual');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<{ id: string; image: string } | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      captchaAnswer: '',
      role: 'THERAPIST',
      licenseNumber: '',
      yearsOfExperience: '',
      organization: '',
      specializations: '',
      bio: '',
    },
  });

  const loadCaptcha = useCallback(async () => {
    try {
      const { data } = await api.get('/captcha/generate');
      setCaptcha(data);
    } catch {
      // Captcha may not be available in dev
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const handleTabChange = (newTab: 'individual' | 'professional') => {
    setTab(newTab);
    setError('');
    form.setValue('captchaAnswer', '');
    loadCaptcha();
  };

  const onSubmit = async (data: SignupForm) => {
    setError('');
    setLoading(true);
    try {
      const payload: RegisterData = {
        name: data.name,
        email: data.email,
        password: data.password,
        captchaId: captcha?.id,
        captchaAnswer: data.captchaAnswer,
      };

      if (tab === 'professional') {
        payload.role = data.role;
        payload.licenseNumber = data.licenseNumber || undefined;
        payload.yearsOfExperience = data.yearsOfExperience
          ? parseInt(data.yearsOfExperience, 10)
          : undefined;
        payload.organization = data.organization || undefined;
        payload.specialization = data.specializations
          ? data.specializations.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
        payload.bio = data.bio || undefined;
      }

      await registerUser(payload);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[COLORS.mint, COLORS.teal]} style={styles.header}>
          <Text style={styles.brand}>Upllyft</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </LinearGradient>

        <View style={styles.card}>
          {/* Tab Selector */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'individual' && styles.tabActive]}
              onPress={() => handleTabChange('individual')}
            >
              <Text style={[styles.tabText, tab === 'individual' && styles.tabTextActive]}>
                Individual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'professional' && styles.tabActive]}
              onPress={() => handleTabChange('professional')}
            >
              <Text style={[styles.tabText, tab === 'professional' && styles.tabTextActive]}>
                Professional
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'professional' && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>
                Professional accounts require verification. Check your email after registration for
                next steps.
              </Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Common Fields */}
          <Controller
            control={form.control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Full Name"
                icon="person-outline"
                placeholder="Your full name"
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={form.formState.errors.name?.message}
              />
            )}
          />

          <Controller
            control={form.control}
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
                error={form.formState.errors.email?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Password"
                icon="lock-closed-outline"
                placeholder="Minimum 8 characters"
                isPassword
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={form.formState.errors.password?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Confirm Password"
                icon="lock-closed-outline"
                placeholder="Re-enter your password"
                isPassword
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={form.formState.errors.confirmPassword?.message}
              />
            )}
          />

          {/* Professional Fields */}
          {tab === 'professional' && (
            <>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Professional Role</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => setShowRolePicker(!showRolePicker)}
                >
                  <Text style={styles.pickerText}>
                    {ROLES.find(
                      (r) =>
                        r.value ===
                        (form.watch('role') || 'THERAPIST'),
                    )?.label || 'Select Role'}
                  </Text>
                </TouchableOpacity>
                {showRolePicker && (
                  <View style={styles.roleOptions}>
                    {ROLES.map((role) => (
                      <TouchableOpacity
                        key={role.value}
                        style={[
                          styles.roleOption,
                          form.watch('role') === role.value &&
                            styles.roleOptionActive,
                        ]}
                        onPress={() => {
                          form.setValue('role', role.value as 'THERAPIST' | 'EDUCATOR' | 'ORGANIZATION');
                          setShowRolePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            form.watch('role') === role.value &&
                              styles.roleOptionTextActive,
                          ]}
                        >
                          {role.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Controller
                control={form.control}
                name="licenseNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormInput
                    label="License Number"
                    icon="document-text-outline"
                    placeholder="TH-2024-001"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="yearsOfExperience"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormInput
                    label="Years of Experience"
                    icon="time-outline"
                    placeholder="5"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="organization"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormInput
                    label="Organization"
                    icon="business-outline"
                    placeholder="ABC Therapy Center"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="specializations"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormInput
                    label="Specializations"
                    icon="ribbon-outline"
                    placeholder="Pediatric Therapy, Autism Spectrum"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="bio"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormInput
                    label="Professional Bio"
                    icon="create-outline"
                    placeholder="Tell us about your professional background..."
                    multiline
                    numberOfLines={3}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                  />
                )}
              />
            </>
          )}

          {/* Captcha */}
          {captcha && (
            <View style={styles.captchaContainer}>
              <Text style={styles.label}>Captcha Verification</Text>
              <View style={styles.captchaRow}>
                <Image
                  source={{ uri: `${API_URL}/api/captcha/image/${captcha.id}` }}
                  style={styles.captchaImage}
                  resizeMode="contain"
                />
                <TouchableOpacity onPress={loadCaptcha} style={styles.refreshBtn}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={form.control}
                name="captchaAnswer"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormInput
                    label=""
                    placeholder="Enter the characters shown"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={form.formState.errors.captchaAnswer?.message}
                  />
                )}
              />
            </View>
          )}

          <GradientButton
            title="Create Account"
            onPress={form.handleSubmit(onSubmit)}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  brand: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  subtitle: { fontSize: 16, color: COLORS.white, marginTop: 4, opacity: 0.9 },
  card: { flex: 1, padding: 24, marginTop: -16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.white, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.teal },
  infoBanner: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: { color: COLORS.tealDark, fontSize: 13, lineHeight: 18 },
  errorBanner: {
    backgroundColor: COLORS.errorBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center' },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  picker: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerText: { fontSize: 16, color: COLORS.text },
  roleOptions: {
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roleOption: { paddingVertical: 12, paddingHorizontal: 16 },
  roleOptionActive: { backgroundColor: '#F0FDFA' },
  roleOptionText: { fontSize: 15, color: COLORS.text },
  roleOptionTextActive: { color: COLORS.teal, fontWeight: '600' },
  captchaContainer: { marginBottom: 8 },
  captchaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  captchaImage: { width: 160, height: 50, borderRadius: 8, backgroundColor: COLORS.inputBg },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
  },
  refreshText: { color: COLORS.teal, fontWeight: '600', fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 32 },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  linkText: { color: COLORS.teal, fontSize: 14, fontWeight: '600' },
});
