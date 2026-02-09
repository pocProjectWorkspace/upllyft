import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../contexts/auth-context';
import { useProfile } from '../../../hooks/use-profile';
import { COLORS } from '../../../lib/constants';

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const { isProfessional, isVerified, logout } = useAuth();
  const { profile, stats, loading, refresh } = useProfile();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems: MenuItem[] = [
    { label: 'Edit Profile', icon: 'create-outline', onPress: () => router.push('/(main)/(profile)/edit') },
    { label: 'Bookmarks', icon: 'bookmark-outline', onPress: () => router.push('/(main)/(profile)/bookmarks') },
    { label: 'My Organizations', icon: 'business-outline', onPress: () => {} },
    { label: 'Settings', icon: 'settings-outline', onPress: () => router.push('/(main)/(profile)/settings') },
    { label: 'Help & Support', icon: 'help-circle-outline', onPress: () => {} },
    { label: 'Log Out', icon: 'log-out-outline', onPress: handleLogout, danger: true },
  ];

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.teal} />
        }
      >
        {/* User info */}
        <View style={styles.profileHeader}>
          {profile?.image ? (
            <Image source={{ uri: profile.image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color={COLORS.teal} />
            </View>
          )}
          <Text style={styles.name}>{profile?.name || 'User'}</Text>
          <View style={styles.roleRow}>
            <Text style={styles.role}>{profile?.role || 'Member'}</Text>
            {isProfessional && isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.teal} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          {profile?.bio && (
            <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.connectionCount}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.bookmarkCount}</Text>
            <Text style={styles.statLabel}>Bookmarks</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon} size={22} color={item.danger ? COLORS.error : COLORS.text} />
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  role: { fontSize: 14, color: COLORS.textSecondary, textTransform: 'capitalize' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 13, color: COLORS.teal, fontWeight: '500' },
  bio: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  stats: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  menu: { gap: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.text },
  menuLabelDanger: { color: COLORS.error },
});
