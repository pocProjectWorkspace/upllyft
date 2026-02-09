import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Community, getCommunity, joinCommunity, leaveCommunity, getCommunityPosts } from '../../../lib/api/communities';
import { Post } from '../../../lib/types/community';
import { formatRelativeTime } from '../../../lib/utils';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([getCommunity(id!), getCommunityPosts(id!)]);
        setCommunity(c);
        setJoined(!!c.isJoined);
        setPosts(Array.isArray(p) ? p : p.posts ?? []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleToggleJoin = async () => {
    setJoining(true);
    try {
      if (joined) await leaveCommunity(id!);
      else await joinCommunity(id!);
      setJoined(!joined);
    } catch { /* ignore */ }
    finally { setJoining(false); }
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;
  if (!community) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={{ color: COLORS.textSecondary }}>Community not found</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.infoCard}>
            <Text style={styles.communityName}>{community.name}</Text>
            {community.description ? <Text style={styles.communityDesc}>{community.description}</Text> : null}
            <View style={styles.statsRow}>
              <Text style={styles.stat}>{community.memberCount} members</Text>
              <Text style={styles.stat}>{community.postCount} posts</Text>
            </View>
            <TouchableOpacity style={[styles.joinBtn, joined && styles.joinedBtn]} onPress={handleToggleJoin} disabled={joining}>
              <Text style={[styles.joinBtnText, joined && styles.joinedBtnText]}>{joined ? 'Joined' : 'Join'}</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.postCard} onPress={() => router.push({ pathname: '/(main)/(community)/[id]', params: { id: item.id } })}>
            <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.postMeta}>{item.author?.name || 'Anonymous'} · {formatRelativeTime(item.createdAt)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No posts in this community yet</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  list: { padding: 16 },
  infoCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  communityName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  communityDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  stat: { fontSize: 13, color: COLORS.textSecondary },
  joinBtn: { backgroundColor: COLORS.teal, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  joinedBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.teal },
  joinBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  joinedBtnText: { color: COLORS.teal },
  postCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  postTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  postMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },
});
