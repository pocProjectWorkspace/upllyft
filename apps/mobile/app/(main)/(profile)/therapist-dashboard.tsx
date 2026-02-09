import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { TherapistProfile, SessionType } from '../../../lib/types/marketplace';
import { getMyTherapistProfile, getMySessionTypes, getMyAnalytics } from '../../../lib/api/therapist-dashboard';

interface Analytics { totalBookings: number; totalRevenue: number; averageRating: number; completedSessions: number }

export default function TherapistDashboardScreen() {
  const [profile, setProfile] = useState<TherapistProfile | null>(null);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const [p, st, a] = await Promise.all([
        getMyTherapistProfile(),
        getMySessionTypes(),
        getMyAnalytics().catch(() => null),
      ]);
      setProfile(p);
      setSessionTypes(st);
      setAnalytics(a);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetch().finally(() => setLoading(false)); }, []);
  const refresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;
  if (!profile) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={{ color: COLORS.textSecondary }}>No therapist profile found. Set up your profile to get started.</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Therapist Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.profileName}>{profile.user.name || 'Therapist'}</Text>
            <View style={[styles.activeBadge, { backgroundColor: profile.acceptingBookings ? COLORS.teal + '18' : '#EF444418' }]}>
              <View style={[styles.dot, { backgroundColor: profile.acceptingBookings ? COLORS.teal : '#EF4444' }]} />
              <Text style={{ fontSize: 12, color: profile.acceptingBookings ? COLORS.teal : '#EF4444', fontWeight: '600' }}>{profile.acceptingBookings ? 'Accepting' : 'Not Accepting'}</Text>
            </View>
          </View>
          {profile.title && <Text style={styles.profileTitle}>{profile.title}</Text>}
        </View>

        {/* Analytics */}
        {analytics && (
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Ionicons name="calendar" size={20} color={COLORS.teal} />
              <Text style={styles.analyticsValue}>{analytics.totalBookings}</Text>
              <Text style={styles.analyticsLabel}>Bookings</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.teal} />
              <Text style={styles.analyticsValue}>{analytics.completedSessions}</Text>
              <Text style={styles.analyticsLabel}>Completed</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Ionicons name="star" size={20} color="#F59E0B" />
              <Text style={styles.analyticsValue}>{analytics.averageRating?.toFixed(1) || '—'}</Text>
              <Text style={styles.analyticsLabel}>Rating</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Ionicons name="cash" size={20} color={COLORS.teal} />
              <Text style={styles.analyticsValue}>${analytics.totalRevenue}</Text>
              <Text style={styles.analyticsLabel}>Revenue</Text>
            </View>
          </View>
        )}

        {/* Session Types */}
        <Text style={styles.sectionTitle}>Session Types ({sessionTypes.length})</Text>
        {sessionTypes.map(st => (
          <View key={st.id} style={styles.sessionCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionName}>{st.name}</Text>
              <Text style={styles.sessionMeta}>{st.duration} min · {st.currency} {st.defaultPrice}</Text>
            </View>
          </View>
        ))}
        {sessionTypes.length === 0 && <Text style={styles.emptyText}>No session types configured</Text>}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(main)/(marketplace)/bookings')}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.teal} />
          <Text style={styles.actionText}>View Bookings</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20 },
  statusCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  profileTitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  analyticsCard: { width: '47%' as any, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  analyticsValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  analyticsLabel: { fontSize: 12, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  sessionName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sessionMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  actionText: { flex: 1, fontSize: 15, color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
