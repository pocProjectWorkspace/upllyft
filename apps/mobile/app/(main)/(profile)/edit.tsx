import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { useProfile } from '../../../hooks/use-profile';

export default function EditProfileScreen() {
  const { profile, loading, update } = useProfile();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [education, setEducation] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [specialization, setSpecialization] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
      setOrganization(profile.organization || '');
      setPhone(profile.phone || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setEducation(profile.education || '');
      setYearsOfExperience(profile.yearsOfExperience?.toString() || '');
      setSpecialization(profile.specialization?.join(', ') || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      await update({
        name: name.trim(),
        bio: bio.trim() || undefined,
        organization: organization.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        education: education.trim() || undefined,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
        specialization: specialization
          ? specialization.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      Alert.alert('Success', 'Profile updated', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.teal} />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <Field label="Name *" value={name} onChangeText={setName} />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline />
          <Field label="Organization" value={organization} onChangeText={setOrganization} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Location" value={location} onChangeText={setLocation} />
          <Field label="Website" value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" />
          <Field label="Education" value={education} onChangeText={setEducation} />
          <Field label="Years of Experience" value={yearsOfExperience} onChangeText={setYearsOfExperience} keyboardType="numeric" />
          <Field
            label="Specializations"
            value={specialization}
            onChangeText={setSpecialization}
            placeholder="Comma separated"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'url' | 'numeric';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  saveBtn: { fontSize: 16, fontWeight: '600', color: COLORS.teal },
  form: { padding: 20 },
});
