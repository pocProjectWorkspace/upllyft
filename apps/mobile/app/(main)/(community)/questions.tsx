import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Question } from '../../../lib/types/questions';
import { getQuestions } from '../../../lib/api/questions';
import { formatRelativeTime } from '../../../lib/utils';

export default function QuestionsScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetch = useCallback(async (p: number, replace: boolean) => {
    try {
      const res = await getQuestions(p);
      const items = res.questions ?? [];
      if (replace) setQuestions(items); else setQuestions(prev => [...prev, ...items]);
      setHasMore(res.hasMore ?? false);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetch(1, true).finally(() => setLoading(false)); }, []);

  const refresh = async () => { setRefreshing(true); setPage(1); await fetch(1, true); setRefreshing(false); };
  const loadMore = () => { if (!hasMore || loading) return; const next = page + 1; setPage(next); fetch(next, false); };

  const renderQuestion = ({ item }: { item: Question }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/(main)/(community)/question-detail', params: { id: item.id } })}>
      <View style={styles.cardTop}>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'OPEN' ? COLORS.teal + '18' : COLORS.textSecondary + '18' }]}>
          <Text style={[styles.statusText, { color: item.status === 'OPEN' ? COLORS.teal : COLORS.textSecondary }]}>{item.status}</Text>
        </View>
        {item.hasAcceptedAnswer && <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{item.author?.name || 'Anonymous'}</Text>
        <Text style={styles.metaText}>·</Text>
        <Text style={styles.metaText}>{item.answerCount} answers</Text>
        <Text style={styles.metaText}>·</Text>
        <Text style={styles.metaText}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Q&A</Text>
        <TouchableOpacity onPress={() => router.push('/(main)/(community)/ask-question')} hitSlop={12}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.teal} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={renderQuestion}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} /> : <View style={styles.empty}><Text style={styles.emptyText}>No questions yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardContent: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
