import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { getPreferences, updatePreferences, UserPreferences } from '../../../lib/api/settings';

export default function PrivacyScreen() {
  const [prefs, setPrefs] = useState<UserPreferences>({});

  useEffect(() => { getPreferences().then(setPrefs).catch(() => {}); }, []);

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
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Profile Visibility</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="eye-outline" size={20} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Public Profile</Text>
              <Text style={styles.rowDesc}>Allow others to view your profile</Text>
            </View>
          </View>
          <Switch value={prefs.publicProfile !== false} onValueChange={() => toggle('publicProfile')} trackColor={{ true: COLORS.teal }} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="search-outline" size={20} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Searchable</Text>
              <Text style={styles.rowDesc}>Appear in search results</Text>
            </View>
          </View>
          <Switch value={prefs.searchable !== false} onValueChange={() => toggle('searchable')} trackColor={{ true: COLORS.teal }} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="analytics-outline" size={20} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Show Activity Status</Text>
              <Text style={styles.rowDesc}>Let others see when you're online</Text>
            </View>
          </View>
          <Switch value={!!prefs.showActivityStatus} onValueChange={() => toggle('showActivityStatus')} trackColor={{ true: COLORS.teal }} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Data</Text>
        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name="download-outline" size={20} color={COLORS.text} />
          <Text style={styles.rowLabel}>Export My Data</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text, flex: 1 },
  rowDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
});
