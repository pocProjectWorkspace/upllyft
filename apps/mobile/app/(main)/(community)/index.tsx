import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { usePosts } from '../../../hooks/use-posts';
import PostCard from '../../../components/community/PostCard';
import FilterPills from '../../../components/community/FilterPills';
import FeedAd from '../../../components/community/FeedAd';
import {
  getActiveBannerAds,
  trackAdImpression,
  type BannerAd,
} from '../../../lib/api/banner-ads';

type FeedItem =
  | { type: 'post'; data: any }
  | { type: 'ad'; data: BannerAd };

const AD_INTERVAL = 7;

export default function CommunityScreen() {
  const {
    posts,
    loading,
    refreshing,
    error,
    activeType,
    sort,
    setActiveType,
    setSort,
    refresh,
    loadMore,
  } = usePosts();

  const [feedAds, setFeedAds] = useState<BannerAd[]>([]);
  const trackedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    getActiveBannerAds('FEED').then(setFeedAds).catch(() => {});
  }, []);

  const feedItems: FeedItem[] = React.useMemo(() => {
    if (feedAds.length === 0) {
      return posts.map((p) => ({ type: 'post' as const, data: p }));
    }
    const items: FeedItem[] = [];
    let adIndex = 0;
    posts.forEach((post, i) => {
      items.push({ type: 'post', data: post });
      if ((i + 1) % AD_INTERVAL === 0) {
        items.push({ type: 'ad', data: feedAds[adIndex % feedAds.length] });
        adIndex++;
      }
    });
    return items;
  }, [posts, feedAds]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const token of viewableItems) {
        const item = token.item as FeedItem;
        if (item.type === 'ad' && !trackedIds.current.has(item.data.id)) {
          trackedIds.current.add(item.data.id);
          trackAdImpression(item.data.id).catch(() => {});
        }
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderHeader = () => (
    <FilterPills
      activeType={activeType}
      sort={sort}
      onTypeChange={setActiveType}
      onSortChange={setSort}
    />
  );

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
        <Ionicons name="chatbubbles-outline" size={48} color={COLORS.border} />
        <Text style={styles.emptyText}>No posts yet</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || posts.length === 0) return null;
    return (
      <ActivityIndicator
        style={{ paddingVertical: 20 }}
        color={COLORS.teal}
      />
    );
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'ad') {
      return <FeedAd ad={item.data} />;
    }
    return <PostCard post={item.data} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && posts.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item, index) =>
            item.type === 'ad' ? `ad-${item.data.id}-${index}` : item.data.id
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={COLORS.teal}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/(main)/(community)/create')}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingTop: 4 },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: COLORS.teal,
    borderRadius: 20,
  },
  retryText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
