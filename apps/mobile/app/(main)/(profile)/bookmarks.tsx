import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { useBookmarks } from '../../../hooks/use-bookmarks';
import PostCard from '../../../components/community/PostCard';

export default function BookmarksScreen() {
  const { bookmarks, loading, refreshing, error, refresh, loadMore } = useBookmarks();

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={48} color={COLORS.border} />
        <Text style={styles.emptyTitle}>No bookmarks yet</Text>
        <Text style={styles.emptySubtext}>Posts you bookmark will appear here</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && bookmarks.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item.post} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.teal} />
          }
          ListFooterComponent={
            loading && bookmarks.length > 0 ? (
              <ActivityIndicator style={{ paddingVertical: 20 }} color={COLORS.teal} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  list: { padding: 20 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: COLORS.teal,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: { color: COLORS.white, fontWeight: '600' },
});
