import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { SessionType } from '../../../lib/types/marketplace';
import { getMySessionTypes } from '../../../lib/api/therapist-dashboard';

export default function PricingScreen() {
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try { setSessionTypes(await getMySessionTypes()); } catch { /* ignore */ }
  };

  useEffect(() => { fetch().finally(() => setLoading(false)); }, []);
  const refresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Types & Pricing</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={sessionTypes}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{item.currency} {item.defaultPrice}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{item.duration} minutes</Text>
            {item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
          </View>
        )}
        ListEmptyComponent={
          loading ? <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} />
          : <View style={styles.empty}>
              <Ionicons name="pricetags-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No session types configured</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  list: { padding: 16, paddingBottom: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1 },
  priceBadge: { backgroundColor: COLORS.teal + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priceText: { fontSize: 14, fontWeight: '700', color: COLORS.teal },
  cardMeta: { fontSize: 13, color: COLORS.textSecondary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
