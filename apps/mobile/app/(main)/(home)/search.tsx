import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Post } from '../../../lib/types/community';
import { searchPosts } from '../../../lib/api/search';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchPosts(query.trim());
      setResults(res.posts);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts..."
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/(main)/(community)/[id]', params: { id: item.id } })}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{item.author?.name || 'Anonymous'}</Text>
              <Text style={styles.metaText}>·</Text>
              <Text style={styles.metaText}>{item.commentCount ?? 0} comments</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 40 }} />
          : searched ? <View style={styles.empty}><Ionicons name="search" size={40} color={COLORS.textSecondary} /><Text style={styles.emptyText}>No results found</Text></View>
          : <View style={styles.empty}><Text style={styles.emptyText}>Search for posts, discussions, and more</Text></View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardContent: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
