import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { PublicUser, getUser, followUser, unfollowUser } from '../../../lib/api/users';
import { useAuth } from '../../../contexts/auth-context';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    getUser(id!)
      .then(p => { setProfile(p); setFollowing(!!p.isFollowing); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleFollow = async () => {
    setToggling(true);
    try {
      if (following) await unfollowUser(id!);
      else await followUser(id!);
      setFollowing(!following);
    } catch { /* ignore */ }
    finally { setToggling(false); }
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;
  if (!profile) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={{ color: COLORS.textSecondary }}>User not found</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile.name || 'U')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name || 'User'}</Text>
            {profile.isVerified && <Ionicons name="checkmark-circle" size={18} color={COLORS.teal} />}
          </View>
          <Text style={styles.role}>{profile.role}</Text>
          {profile.organization && <Text style={styles.org}>{profile.organization}</Text>}
        </View>

        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followingBtn]}
            onPress={handleToggleFollow}
            disabled={toggling}
          >
            <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}

        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile._count?.posts ?? 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile._count?.followers ?? profile.followerCount ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile._count?.following ?? profile.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.teal + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.teal },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  role: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  org: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  followBtn: { backgroundColor: COLORS.teal, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.teal },
  followBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  followingBtnText: { color: COLORS.teal },
  bio: { fontSize: 14, color: COLORS.text, lineHeight: 22, marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
