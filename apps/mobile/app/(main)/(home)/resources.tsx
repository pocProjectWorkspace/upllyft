import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { getResources, getResourceCategories, Resource } from '../../../lib/api/resources';

export default function ResourcesScreen() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async (category?: string) => {
    try {
      const data = await getResources(category);
      setResources(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    Promise.all([fetch(), getResourceCategories().then(setCategories).catch(() => {})])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(activeCategory); }, [activeCategory]);

  const refresh = async () => { setRefreshing(true); await fetch(activeCategory); setRefreshing(false); };

  const renderResource = ({ item }: { item: Resource }) => (
    <TouchableOpacity style={styles.card} onPress={() => item.url ? Linking.openURL(item.url) : undefined}>
      <View style={styles.iconWrap}>
        <Ionicons name="document-text-outline" size={20} color={COLORS.teal} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
        <View style={styles.cardMeta}>
          <Text style={styles.metaBadge}>{item.type}</Text>
          <Text style={styles.metaBadge}>{item.category}</Text>
        </View>
      </View>
      {item.url && <Ionicons name="open-outline" size={16} color={COLORS.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Resources</Text>
        <View style={{ width: 24 }} />
      </View>

      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <TouchableOpacity style={[styles.chip, !activeCategory && styles.chipActive]} onPress={() => setActiveCategory(undefined)}>
            <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, activeCategory === c && styles.chipActive]} onPress={() => setActiveCategory(c)}>
              <Text style={[styles.chipText, activeCategory === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={resources}
        keyExtractor={item => item.id}
        renderItem={renderResource}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} /> : <View style={styles.empty}><Text style={styles.emptyText}>No resources found</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  filters: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.teal + '14', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  metaBadge: { fontSize: 11, color: COLORS.teal, backgroundColor: COLORS.teal + '14', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
