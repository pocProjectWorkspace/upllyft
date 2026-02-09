import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking as RNLinking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { getEvent, toggleInterest, removeInterest } from '../../../lib/api/events';
import { EventItem, InterestStatus } from '../../../lib/types/events';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [interest, setInterest] = useState<InterestStatus | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getEvent(id!);
        setEvent(data);
        setInterest(data.userInterest);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleInterest = async (status: InterestStatus) => {
    if (!event) return;
    const prev = interest;
    if (interest === status) {
      setInterest(null);
      removeInterest(event.id).catch(() => setInterest(prev));
    } else {
      setInterest(status);
      toggleInterest(event.id, status).catch(() => setInterest(prev));
    }
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;
  if (!event) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={styles.errorText}>Event not found</Text></View></SafeAreaView>;

  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.formatBadge, { backgroundColor: event.format === 'VIRTUAL' ? '#3B82F618' : '#0D948818' }]}>
          <Ionicons name={event.format === 'VIRTUAL' ? 'videocam-outline' : 'location-outline'} size={14} color={event.format === 'VIRTUAL' ? '#3B82F6' : COLORS.teal} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: event.format === 'VIRTUAL' ? '#3B82F6' : COLORS.teal }}>
            {event.format === 'IN_PERSON' ? 'In Person' : event.format === 'HYBRID' ? 'Hybrid' : 'Virtual'}
          </Text>
        </View>

        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar" size={18} color={COLORS.teal} />
          <Text style={styles.metaText}>
            {startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' at '}
            {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            {endDate ? ` — ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
          </Text>
        </View>

        {(event.venue || event.city || event.location) && (
          <View style={styles.metaRow}>
            <Ionicons name="location" size={18} color={COLORS.teal} />
            <Text style={styles.metaText}>{event.venue || event.location || [event.city, event.state].filter(Boolean).join(', ')}</Text>
          </View>
        )}

        {(event.meetingLink || event.virtualLink) && (
          <TouchableOpacity style={styles.metaRow} onPress={() => RNLinking.openURL(event.meetingLink || event.virtualLink!)}>
            <Ionicons name="link" size={18} color={COLORS.teal} />
            <Text style={[styles.metaText, { color: COLORS.teal }]}>Join virtual meeting</Text>
          </TouchableOpacity>
        )}

        <View style={styles.metaRow}>
          <Ionicons name="people" size={18} color={COLORS.teal} />
          <Text style={styles.metaText}>
            {event._count.interests} interested
            {event.maxAttendees ? ` · ${event.maxAttendees} max` : ''}
          </Text>
        </View>

        <Text style={styles.description}>{event.description}</Text>

        {event.tags.length > 0 && (
          <View style={styles.tags}>
            {event.tags.map(tag => (
              <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>
        )}

        {/* Interest buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, interest === 'INTERESTED' && styles.actionBtnActive]}
            onPress={() => handleInterest('INTERESTED')}
          >
            <Ionicons name={interest === 'INTERESTED' ? 'star' : 'star-outline'} size={18} color={interest === 'INTERESTED' ? COLORS.white : COLORS.teal} />
            <Text style={[styles.actionText, interest === 'INTERESTED' && styles.actionTextActive]}>Interested</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, interest === 'GOING' && styles.actionBtnActive]}
            onPress={() => handleInterest('GOING')}
          >
            <Ionicons name={interest === 'GOING' ? 'checkmark-circle' : 'checkmark-circle-outline'} size={18} color={interest === 'GOING' ? COLORS.white : COLORS.teal} />
            <Text style={[styles.actionText, interest === 'GOING' && styles.actionTextActive]}>Going</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  content: { padding: 20 },
  formatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  metaText: { fontSize: 14, color: COLORS.text, flex: 1 },
  description: { fontSize: 15, color: COLORS.text, lineHeight: 24, marginTop: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: { backgroundColor: COLORS.inputBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 12, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.teal },
  actionBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  actionText: { fontSize: 15, fontWeight: '600', color: COLORS.teal },
  actionTextActive: { color: COLORS.white },
  errorText: { fontSize: 15, color: COLORS.textSecondary },
});
