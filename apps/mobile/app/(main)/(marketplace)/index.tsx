import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { useTherapists } from '../../../hooks/use-therapists';
import { TherapistProfile } from '../../../lib/types/marketplace';

const SPECIALIZATIONS = ['All', 'Anxiety', 'Depression', 'Trauma', 'CBT', 'PTSD', 'Couples', 'Addiction'];

export default function MarketplaceScreen() {
  const { therapists, loading, refreshing, hasMore, specialization, setSpecialization, refresh, loadMore } = useTherapists();
  const [search, setSearch] = useState('');

  const filtered = search
    ? therapists.filter(t => (t.user.name || '').toLowerCase().includes(search.toLowerCase()) || t.specializations.some(s => s.toLowerCase().includes(search.toLowerCase())))
    : therapists;

  const renderTherapist = ({ item }: { item: TherapistProfile }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => router.push({ pathname: '/(main)/(marketplace)/[id]', params: { id: item.id } })}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.user.name || 'T')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{item.user.name || 'Therapist'}</Text>
        {item.title && <Text style={styles.cardTitle}>{item.title}</Text>}
        <Text style={styles.cardSpecialty} numberOfLines={1}>{item.specializations.slice(0, 3).join(' · ')}</Text>
        <View style={styles.cardMeta}>
          {item.overallRating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.overallRating.toFixed(1)}</Text>
              <Text style={styles.metaLight}>({item.totalRatings})</Text>
            </View>
          )}
          {item.yearsExperience != null && <Text style={styles.metaLight}>{item.yearsExperience}y exp</Text>}
        </View>
      </View>
      {item.acceptingBookings && (
        <View style={styles.availableBadge}><Text style={styles.availableText}>Available</Text></View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity onPress={() => router.push('/(main)/(marketplace)/bookings')} hitSlop={12}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search therapists..." placeholderTextColor={COLORS.textSecondary} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {SPECIALIZATIONS.map(s => {
          const active = s === 'All' ? !specialization : specialization === s;
          return (
            <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setSpecialization(s === 'All' ? undefined : s)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderTherapist}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && therapists.length > 0 ? <ActivityIndicator color={COLORS.teal} style={{ paddingVertical: 16 }} /> : null}
        ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="search" size={40} color={COLORS.textSecondary} /><Text style={styles.emptyText}>No therapists found</Text></View> : <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 10, marginHorizontal: 20, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  filters: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.teal + '18', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.teal },
  cardContent: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardTitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  cardSpecialty: { fontSize: 13, color: COLORS.teal, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  metaLight: { fontSize: 12, color: COLORS.textSecondary },
  availableBadge: { backgroundColor: '#0D948818', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  availableText: { fontSize: 11, fontWeight: '600', color: COLORS.teal },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
