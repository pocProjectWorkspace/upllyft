import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/auth-context';

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword) { setError('Please fill in all fields'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm Deletion', 'Type "DELETE" to confirm', [{ text: 'Cancel' }], { cancelable: true });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Email</Text>
        <View style={styles.emailRow}>
          <Text style={styles.emailText}>{user?.email || '—'}</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Change Password</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <TextInput style={styles.input} placeholder="Current password" placeholderTextColor={COLORS.textSecondary} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
        <TextInput style={styles.input} placeholder="New password" placeholderTextColor={COLORS.textSecondary} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
        <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor={COLORS.textSecondary} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Update Password</Text>}
        </TouchableOpacity>

        <View style={styles.dangerZone}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  emailRow: { backgroundColor: COLORS.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  emailText: { fontSize: 15, color: COLORS.text },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 14, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  saveBtn: { backgroundColor: COLORS.teal, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  errorText: { fontSize: 13, color: '#EF4444', marginBottom: 8 },
  successText: { fontSize: 13, color: COLORS.teal, marginBottom: 8 },
  dangerZone: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#EF4444' },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});
