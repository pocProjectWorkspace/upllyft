import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Booking } from '../../../lib/types/marketplace';
import { getBooking, cancelBooking, completeBooking, rateBooking } from '../../../lib/api/marketplace';

const STATUS_COLORS: Record<string, string> = { PENDING: '#F59E0B', CONFIRMED: '#3B82F6', COMPLETED: COLORS.teal, CANCELLED: '#EF4444', REJECTED: '#EF4444' };

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBooking(id!)
      .then(setBooking)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure?', [
      { text: 'No' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try { await cancelBooking(id!); setBooking(prev => prev ? { ...prev, status: 'CANCELLED' } : prev); } catch { Alert.alert('Error', 'Failed to cancel'); }
      }},
    ]);
  };

  const handleComplete = async () => {
    try { await completeBooking(id!); setBooking(prev => prev ? { ...prev, status: 'COMPLETED' } : prev); } catch { Alert.alert('Error', 'Failed to mark complete'); }
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;
  if (!booking) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={styles.emptyText}>Booking not found</Text></View></SafeAreaView>;

  const date = new Date(booking.startDateTime);
  const endDate = new Date(booking.endDateTime);
  const color = STATUS_COLORS[booking.status] || COLORS.textSecondary;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusBadge, { backgroundColor: color + '18', alignSelf: 'flex-start' }]}>
          <Text style={[styles.statusText, { color }]}>{booking.status}</Text>
        </View>

        <Text style={styles.therapistName}>{booking.therapist?.user?.name || 'Therapist'}</Text>
        <Text style={styles.sessionName}>{booking.sessionType?.name || 'Session'}</Text>

        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={18} color={COLORS.teal} />
          <Text style={styles.detailText}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={18} color={COLORS.teal} />
          <Text style={styles.detailText}>
            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({booking.duration} min)
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={18} color={COLORS.teal} />
          <Text style={styles.detailText}>{booking.currency} {booking.subtotal}</Text>
        </View>

        {booking.googleMeetLink && (
          <TouchableOpacity style={styles.meetButton} onPress={() => Linking.openURL(booking.googleMeetLink!)}>
            <Ionicons name="videocam" size={18} color={COLORS.white} />
            <Text style={styles.meetText}>Join Google Meet</Text>
          </TouchableOpacity>
        )}

        {booking.patientNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Your Notes</Text>
            <Text style={styles.notesText}>{booking.patientNotes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          {booking.status === 'CONFIRMED' && (
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
              <Text style={styles.completeText}>Mark as Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 16 },
  statusText: { fontSize: 13, fontWeight: '600' },
  therapistName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  sessionName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2, marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  detailText: { fontSize: 14, color: COLORS.text, flex: 1 },
  meetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  meetText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  notesSection: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  actions: { marginTop: 32, gap: 12 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#EF4444', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  completeBtn: { backgroundColor: COLORS.teal, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  completeText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
