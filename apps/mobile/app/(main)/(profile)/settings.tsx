import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { useAuth } from '../../../contexts/auth-context';
import { getPreferences, updatePreferences, UserPreferences } from '../../../lib/api/settings';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>({});

  useEffect(() => { getPreferences().then(setPrefs).catch(() => {}); }, []);

  const togglePref = (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    updatePreferences({ [key]: updated[key] }).catch(() => setPrefs(prefs));
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}><Ionicons name="notifications-outline" size={20} color={COLORS.text} /><Text style={styles.rowLabel}>Push Notifications</Text></View>
            <Switch value={!!prefs.pushNotifications} onValueChange={() => togglePref('pushNotifications')} trackColor={{ true: COLORS.teal }} />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}><Ionicons name="mail-outline" size={20} color={COLORS.text} /><Text style={styles.rowLabel}>Email Notifications</Text></View>
            <Switch value={!!prefs.emailNotifications} onValueChange={() => togglePref('emailNotifications')} trackColor={{ true: COLORS.teal }} />
          </View>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/(profile)/notification-settings')}>
            <Ionicons name="options-outline" size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>Advanced Settings</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/(profile)/edit')}>
            <Ionicons name="person-outline" size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/(profile)/account')}>
            <Ionicons name="key-outline" size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>Account</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/(profile)/privacy')}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/(profile)/billing')}>
            <Ionicons name="card-outline" size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>Billing</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.row}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>Help & FAQ</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.text} />
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 20, paddingTop: 0 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  rowLabel: { flex: 1, fontSize: 16, color: COLORS.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#EF4444', marginTop: 12 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});
