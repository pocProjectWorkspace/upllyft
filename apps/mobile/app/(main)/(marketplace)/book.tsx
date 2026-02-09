import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { TimeSlot } from '../../../lib/types/marketplace';
import { getAvailableSlots, createBooking } from '../../../lib/api/marketplace';

export default function BookScreen() {
  const params = useLocalSearchParams<{
    therapistId: string; sessionTypeId: string; therapistName: string;
    sessionName: string; duration: string; price: string; currency: string;
  }>();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [notes, setNotes] = useState('');

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (!selectedDate || !params.therapistId || !params.sessionTypeId) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getAvailableSlots(params.therapistId, selectedDate, params.sessionTypeId, tz)
      .then(data => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await createBooking({
        therapistId: params.therapistId!,
        sessionTypeId: params.sessionTypeId!,
        startDateTime: selectedSlot.startTime,
        timezone: tz,
        patientNotes: notes || undefined,
      });
      Alert.alert('Booked!', 'Your session has been booked successfully.', [
        { text: 'View Bookings', onPress: () => router.replace('/(main)/(marketplace)/bookings') },
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to book session. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), num: d.getDate() };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Session info */}
        <View style={styles.infoCard}>
          <Text style={styles.therapistName}>{params.therapistName}</Text>
          <Text style={styles.sessionInfo}>{params.sessionName} · {params.duration} min</Text>
          <Text style={styles.priceText}>{params.currency} {params.price}</Text>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {dates.map(d => {
            const { day, num } = formatDate(d);
            const active = d === selectedDate;
            return (
              <TouchableOpacity key={d} style={[styles.dateChip, active && styles.dateChipActive]} onPress={() => setSelectedDate(d)}>
                <Text style={[styles.dateDay, active && styles.dateDayActive]}>{day}</Text>
                <Text style={[styles.dateNum, active && styles.dateNumActive]}>{num}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time slots */}
        {selectedDate ? (
          <>
            <Text style={styles.sectionTitle}>Available Times</Text>
            {loadingSlots ? (
              <ActivityIndicator color={COLORS.teal} style={{ marginTop: 16 }} />
            ) : slots.length > 0 ? (
              <View style={styles.slotsGrid}>
                {slots.map((slot, i) => {
                  const active = selectedSlot?.startTime === slot.startTime;
                  return (
                    <TouchableOpacity key={i} style={[styles.slotChip, active && styles.slotChipActive]} onPress={() => setSelectedSlot(slot)}>
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>{formatTime(slot.startTime)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noSlots}>No available slots for this date</Text>
            )}
          </>
        ) : (
          <Text style={styles.noSlots}>Select a date to see available times</Text>
        )}

        {/* Notes */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Anything you'd like the therapist to know..."
          placeholderTextColor={COLORS.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </ScrollView>

      {/* Book button */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity style={[styles.ctaButton, !selectedSlot && styles.ctaDisabled]} onPress={handleBook} disabled={!selectedSlot || booking}>
          {booking ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.ctaText}>Confirm Booking</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20, paddingBottom: 100 },
  infoCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  therapistName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sessionInfo: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  priceText: { fontSize: 16, fontWeight: '700', color: COLORS.teal, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  dateRow: { gap: 8, paddingBottom: 16 },
  dateChip: { width: 56, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  dateChipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  dateDay: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  dateDayActive: { color: COLORS.white },
  dateNum: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  dateNumActive: { color: COLORS.white },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  slotChipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  slotText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  slotTextActive: { color: COLORS.white },
  noSlots: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  notesInput: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  ctaButton: { backgroundColor: COLORS.teal, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
