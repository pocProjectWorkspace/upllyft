import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Booking } from '../../../lib/types/marketplace';
import { useBookings } from '../../../hooks/use-bookings';
import { cancelBooking } from '../../../lib/api/marketplace';

const STATUS_FILTERS = ['All', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_LABELS: Record<string, string> = { PENDING: 'Pending', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected' };
const STATUS_COLORS: Record<string, string> = { PENDING: '#F59E0B', CONFIRMED: '#3B82F6', COMPLETED: COLORS.teal, CANCELLED: '#EF4444', REJECTED: '#EF4444' };

export default function BookingsScreen() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { bookings, loading, refreshing, refresh } = useBookings(statusFilter);

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
      { text: 'No' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try {
          await cancelBooking(id);
          refresh();
        } catch { Alert.alert('Error', 'Failed to cancel booking'); }
      }},
    ]);
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const date = new Date(item.startDateTime);
    const color = STATUS_COLORS[item.status] || COLORS.textSecondary;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/(main)/(marketplace)/booking-detail', params: { id: item.id } })}>
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[item.status] || item.status}</Text>
          </View>
          <Text style={styles.priceText}>{item.currency} {item.subtotal}</Text>
        </View>
        <Text style={styles.therapistName}>{item.therapist?.user?.name || 'Therapist'}</Text>
        <Text style={styles.sessionName}>{item.sessionType?.name || 'Session'} · {item.duration} min</Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>
            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>
        {item.googleMeetLink && (
          <View style={styles.dateRow}>
            <Ionicons name="videocam-outline" size={14} color={COLORS.teal} />
            <Text style={[styles.dateText, { color: COLORS.teal }]}>Google Meet link available</Text>
          </View>
        )}
        {(item.status === 'PENDING' || item.status === 'CONFIRMED') && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {STATUS_FILTERS.map(s => {
          const active = s === 'All' ? !statusFilter : statusFilter === s;
          return (
            <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatusFilter(s === 'All' ? undefined : s)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s === 'All' ? 'All' : STATUS_LABELS[s] || s}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
        ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="calendar-outline" size={40} color={COLORS.textSecondary} /><Text style={styles.emptyText}>No bookings found</Text></View> : <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  filters: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  priceText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  therapistName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sessionName: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dateText: { fontSize: 13, color: COLORS.textSecondary },
  cancelBtn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EF4444' },
  cancelText: { fontSize: 13, fontWeight: '500', color: '#EF4444' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
