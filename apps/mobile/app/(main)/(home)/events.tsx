import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { useEvents } from '../../../hooks/use-events';
import { EventFormat } from '../../../lib/types/events';
import { formatRelativeTime } from '../../../lib/utils';

const FORMAT_FILTERS: { label: string; value: EventFormat | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Virtual', value: 'VIRTUAL' },
  { label: 'In Person', value: 'IN_PERSON' },
  { label: 'Hybrid', value: 'HYBRID' },
];

export default function EventsScreen() {
  const { events, loading, refreshing, error, format, setFormat, refresh, loadMore } = useEvents();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Events</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && events.length === 0 ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.filters}>
              {FORMAT_FILTERS.map(f => {
                const active = format === f.value;
                return (
                  <TouchableOpacity
                    key={f.label}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setFormat(f.value)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(main)/(home)/event-detail?id=${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.formatBadge, { backgroundColor: item.format === 'VIRTUAL' ? '#3B82F618' : '#0D948818' }]}>
                  <Ionicons
                    name={item.format === 'VIRTUAL' ? 'videocam-outline' : 'location-outline'}
                    size={14}
                    color={item.format === 'VIRTUAL' ? '#3B82F6' : COLORS.teal}
                  />
                  <Text style={[styles.formatText, { color: item.format === 'VIRTUAL' ? '#3B82F6' : COLORS.teal }]}>
                    {item.format === 'IN_PERSON' ? 'In Person' : item.format === 'HYBRID' ? 'Hybrid' : 'Virtual'}
                  </Text>
                </View>
                <Text style={styles.time}>{formatRelativeTime(item.startDate)}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.footerText}>
                    {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.footerText}>{item._count.interests} interested</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            error ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>No events found</Text>
              </View>
            )
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
          ListFooterComponent={loading && events.length > 0 ? <ActivityIndicator style={{ paddingVertical: 20 }} color={COLORS.teal} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  filters: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  pillText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  pillTextActive: { color: COLORS.white },
  list: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  formatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  formatText: { fontSize: 11, fontWeight: '600' },
  time: { fontSize: 12, color: COLORS.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', gap: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: COLORS.teal, borderRadius: 20 },
  retryText: { color: COLORS.white, fontWeight: '600' },
});
