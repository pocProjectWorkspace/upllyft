import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Notification } from '../../../lib/types/notifications';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../../lib/api/notifications';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  POST: 'chatbubble-outline',
  COMMENT: 'chatbubbles-outline',
  BOOKING: 'calendar-outline',
  SYSTEM: 'information-circle-outline',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetch = useCallback(async (p: number, replace: boolean) => {
    try {
      const res = await getNotifications(p, 20);
      const items = res.notifications ?? [];
      if (replace) setNotifications(items);
      else setNotifications(prev => [...prev, ...items]);
      setHasMore(p < (res.pagination?.pages ?? 1));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetch(1, true).finally(() => setLoading(false)); }, []);

  const refresh = async () => { setRefreshing(true); setPage(1); await fetch(1, true); setRefreshing(false); };
  const loadMore = () => { if (!hasMore || loading) return; const next = page + 1; setPage(next); fetch(next, false); };

  const handleTap = async (item: Notification) => {
    if (!item.read) {
      markAsRead(item.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    }
    if (item.relatedPostId) router.push({ pathname: '/(main)/(community)/[id]', params: { id: item.relatedPostId } });
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity style={[styles.card, !item.read && styles.cardUnread]} onPress={() => handleTap(item)}>
      <View style={[styles.iconWrap, { backgroundColor: (item.read ? COLORS.textSecondary : COLORS.teal) + '18' }]}>
        <Ionicons name={ICON_MAP[item.type] || 'notifications-outline'} size={20} color={item.read ? COLORS.textSecondary : COLORS.teal} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !item.read && { color: COLORS.text }]}>{item.title}</Text>
        <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={12}>
          <Ionicons name="checkmark-done-outline" size={22} color={COLORS.teal} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="notifications-off-outline" size={40} color={COLORS.textSecondary} /><Text style={styles.emptyText}>No notifications</Text></View> : <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} />}
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
  cardUnread: { backgroundColor: COLORS.teal + '08' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  cardMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  cardTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.teal },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
