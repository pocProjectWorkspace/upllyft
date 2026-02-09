import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../contexts/auth-context';
import { COLORS } from '../../../lib/constants';
import { useHome } from '../../../hooks/use-home';
import { formatRelativeTime } from '../../../lib/utils';
import { getActiveBannerAds, trackAdImpression, trackAdClick, type BannerAd } from '../../../lib/api/banner-ads';

interface Tile {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export default function HomeScreen() {
  const { user, isProfessional, isVerified } = useAuth();
  const { recentPosts, unreadCount, loading, refresh } = useHome();
  const [refreshing, setRefreshing] = React.useState(false);
  const [topBanners, setTopBanners] = React.useState<BannerAd[]>([]);

  React.useEffect(() => {
    getActiveBannerAds('BANNER_TOP').then(setTopBanners).catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const tiles: Tile[] = [
    { id: 'screening', title: 'Screening', icon: 'clipboard-outline', onPress: () => router.navigate('/(main)/(tools)') },
    { id: 'ai', title: 'AI Insights', icon: 'sparkles-outline', onPress: () => router.navigate('/(main)/(tools)') },
    { id: 'events', title: 'Events', icon: 'calendar-outline', onPress: () => router.push('/(main)/(home)/events') },
    { id: 'marketplace', title: 'Marketplace', icon: 'storefront-outline', onPress: () => router.navigate('/(main)/(marketplace)') },
    { id: 'resources', title: 'Resources', icon: 'library-outline', onPress: () => router.push('/(main)/(home)/resources') },
    { id: 'crisis', title: 'Crisis Support', icon: 'heart-outline', onPress: () => router.push('/(main)/(home)/crisis') },
  ];

  const renderTile = ({ item }: { item: Tile }) => (
    <TouchableOpacity style={styles.tile} onPress={item.onPress} activeOpacity={0.7}>
      <Ionicons name={item.icon} size={28} color={COLORS.teal} />
      <Text style={styles.tileText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.teal} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Upllyft</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(main)/(home)/search')}>
              <Ionicons name="search-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(main)/(home)/notifications')}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.sosBtn]} onPress={() => router.push('/(main)/(home)/crisis')}>
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Welcome back, {user?.name || 'User'}</Text>

        {/* Pending verification banner */}
        {isProfessional && !isVerified && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>
              Your professional account is pending verification. You'll receive an email with next steps.
            </Text>
          </View>
        )}

        {/* Event Banner */}
        {topBanners.length > 0 && (
          <TouchableOpacity
            style={styles.eventBanner}
            activeOpacity={0.9}
            onPress={() => {
              trackAdClick(topBanners[0].id).catch(() => {});
              Linking.openURL(topBanners[0].targetUrl).catch(() => {});
            }}
            onLayout={() => {
              trackAdImpression(topBanners[0].id).catch(() => {});
            }}
          >
            <Image
              source={{
                uri: topBanners[0].imageUrl,
                headers: { 'User-Agent': 'Mozilla/5.0' },
              }}
              style={styles.eventBannerImage}
              resizeMode="cover"
              onError={(e) => console.log('Banner image error:', e.nativeEvent.error)}
            />
            <View style={styles.eventBannerOverlay}>
              <Text style={styles.eventBannerTitle} numberOfLines={2}>
                {topBanners[0].title}
              </Text>
            </View>
            <View style={styles.eventBannerBadge}>
              <Text style={styles.eventBannerBadgeText}>Sponsored</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Tile grid */}
        <FlatList
          data={tiles}
          renderItem={renderTile}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.tileRow}
          scrollEnabled={false}
          style={styles.tileGrid}
        />

        {/* Recent feed */}
        <View style={styles.feedSection}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.navigate('/(main)/(community)')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {loading && recentPosts.length === 0 ? (
            <ActivityIndicator color={COLORS.teal} style={{ paddingVertical: 20 }} />
          ) : (
            recentPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.feedCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/(main)/(community)/${post.id}`)}
              >
                <Text style={styles.feedCardTitle} numberOfLines={2}>{post.title}</Text>
                <Text style={styles.feedCardMeta}>
                  {post.author.name || 'Anonymous'} · {formatRelativeTime(post.createdAt)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  brand: { fontSize: 22, fontWeight: '700', color: COLORS.teal },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 6 },
  sosBtn: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sosText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  greeting: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  pendingBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pendingText: { color: '#92400E', fontSize: 14, lineHeight: 20 },
  eventBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#B2DFDB',
    backgroundColor: COLORS.card,
  },
  eventBannerImage: {
    width: Dimensions.get('window').width - 42,
    height: 160,
  },
  eventBannerOverlay: {
    padding: 12,
  },
  eventBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventBannerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  eventBannerBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  tileGrid: { marginBottom: 24 },
  tileRow: { justifyContent: 'space-between', marginBottom: 12 },
  tile: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  tileText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  feedSection: { marginBottom: 24 },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  feedTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  seeAll: { fontSize: 14, color: COLORS.teal, fontWeight: '500' },
  feedCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  feedCardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  feedCardMeta: { fontSize: 13, color: COLORS.textSecondary },
});
