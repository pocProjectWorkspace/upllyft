import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { getPreferences, updatePreferences, UserPreferences } from '../../../lib/api/settings';

const NOTIFICATION_KEYS = [
  { key: 'pushNotifications', label: 'Push Notifications', icon: 'notifications-outline' as const, desc: 'Receive push notifications on your device' },
  { key: 'emailNotifications', label: 'Email Notifications', icon: 'mail-outline' as const, desc: 'Receive notifications via email' },
  { key: 'smsNotifications', label: 'SMS Notifications', icon: 'chatbox-outline' as const, desc: 'Receive text message alerts' },
  { key: 'commentNotifications', label: 'Comments', icon: 'chatbubbles-outline' as const, desc: 'When someone comments on your post' },
  { key: 'bookingNotifications', label: 'Bookings', icon: 'calendar-outline' as const, desc: 'Booking confirmations and reminders' },
  { key: 'communityNotifications', label: 'Community Updates', icon: 'people-outline' as const, desc: 'New posts and activity in your communities' },
];

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<UserPreferences>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { getPreferences().then(setPrefs).catch(() => {}).finally(() => setLoading(false)); }, []);

  const toggle = (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    updatePreferences({ [key]: updated[key] }).catch(() => setPrefs(prefs));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {NOTIFICATION_KEYS.map(item => (
          <View key={item.key} style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name={item.icon} size={20} color={COLORS.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
            </View>
            <Switch
              value={!!prefs[item.key]}
              onValueChange={() => toggle(item.key)}
              trackColor={{ true: COLORS.teal }}
              disabled={loading}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
