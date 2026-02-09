import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Community, browseCommunities } from '../../../lib/api/communities';

export default function CommunitiesScreen() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetch = useCallback(async (p: number, replace: boolean) => {
    try {
      const res = await browseCommunities(p);
      const items = res.communities ?? [];
      if (replace) setCommunities(items); else setCommunities(prev => [...prev, ...items]);
      setHasMore(p < (res.pages ?? 1));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetch(1, true).finally(() => setLoading(false)); }, []);

  const refresh = async () => { setRefreshing(true); setPage(1); await fetch(1, true); setRefreshing(false); };
  const loadMore = () => { if (!hasMore || loading) return; const next = page + 1; setPage(next); fetch(next, false); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Communities</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={communities}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/(main)/(community)/community-detail', params: { id: item.id } })}>
            <View style={styles.avatar}>
              <Ionicons name="people" size={24} color={COLORS.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
              <Text style={styles.meta}>{item.memberCount} members · {item.postCount} posts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} /> : <View style={styles.empty}><Text style={styles.emptyText}>No communities yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.teal + '14', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
