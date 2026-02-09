import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { TherapistProfile, SessionType, SessionRating } from '../../../lib/types/marketplace';
import { getTherapist, getSessionTypes, getTherapistRatings } from '../../../lib/api/marketplace';

export default function TherapistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [therapist, setTherapist] = useState<TherapistProfile | null>(null);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [ratings, setRatings] = useState<SessionRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, st, r] = await Promise.all([
          getTherapist(id!),
          getSessionTypes(id!),
          getTherapistRatings(id!).catch(() => ({ ratings: [], total: 0 })),
        ]);
        setTherapist(t);
        setSessionTypes(Array.isArray(st) ? st : []);
        setRatings(r.ratings ?? []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;
  if (!therapist) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={styles.emptyText}>Therapist not found</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Therapist Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(therapist.user.name || 'T')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{therapist.user.name || 'Therapist'}</Text>
          {therapist.title && <Text style={styles.title}>{therapist.title}</Text>}
          <View style={styles.statsRow}>
            {therapist.overallRating > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.statValue}>{therapist.overallRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>({therapist.totalRatings})</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Ionicons name="briefcase-outline" size={16} color={COLORS.teal} />
              <Text style={styles.statValue}>{therapist.totalSessions}</Text>
              <Text style={styles.statLabel}>sessions</Text>
            </View>
            {therapist.yearsExperience != null && (
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.teal} />
                <Text style={styles.statValue}>{therapist.yearsExperience}</Text>
                <Text style={styles.statLabel}>years</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bio */}
        {therapist.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{therapist.bio}</Text>
          </View>
        )}

        {/* Specializations */}
        {therapist.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specializations</Text>
            <View style={styles.tags}>
              {therapist.specializations.map(s => (
                <View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Languages */}
        {therapist.languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text style={styles.bio}>{therapist.languages.join(', ')}</Text>
          </View>
        )}

        {/* Credentials */}
        {therapist.credentials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credentials</Text>
            {therapist.credentials.map((c, i) => (
              <View key={i} style={styles.credRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                <Text style={styles.credText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Session Types */}
        {sessionTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Types</Text>
            {sessionTypes.map(st => (
              <TouchableOpacity
                key={st.id}
                style={styles.sessionCard}
                onPress={() => router.push({ pathname: '/(main)/(marketplace)/book', params: { therapistId: therapist.id, sessionTypeId: st.id, therapistName: therapist.user.name || 'Therapist', sessionName: st.name, duration: String(st.duration), price: String(st.defaultPrice), currency: st.currency } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionName}>{st.name}</Text>
                  {st.description && <Text style={styles.sessionDesc} numberOfLines={2}>{st.description}</Text>}
                  <Text style={styles.sessionMeta}>{st.duration} min</Text>
                </View>
                <View style={styles.priceCol}>
                  <Text style={styles.price}>{st.currency} {st.defaultPrice}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reviews */}
        {ratings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {ratings.slice(0, 5).map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
                {r.review && <Text style={styles.reviewText}>{r.review}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Book CTA */}
      {therapist.acceptingBookings && sessionTypes.length > 0 && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push({ pathname: '/(main)/(marketplace)/book', params: { therapistId: therapist.id, sessionTypeId: sessionTypes[0].id, therapistName: therapist.user.name || 'Therapist', sessionName: sessionTypes[0].name, duration: String(sessionTypes[0].duration), price: String(sessionTypes[0].defaultPrice), currency: sessionTypes[0].currency } })}
          >
            <Ionicons name="calendar" size={18} color={COLORS.white} />
            <Text style={styles.ctaText}>Book a Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.teal + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.teal },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  bio: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: COLORS.teal + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: '500', color: COLORS.teal },
  credRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  credText: { fontSize: 14, color: COLORS.text },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  sessionName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sessionDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sessionMeta: { fontSize: 12, color: COLORS.teal, marginTop: 4 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  reviewCard: { backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 12, color: COLORS.textSecondary },
  reviewText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.teal, paddingVertical: 14, borderRadius: 12 },
  ctaText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
