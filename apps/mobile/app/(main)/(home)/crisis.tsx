import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { CrisisResource } from '../../../lib/types/crisis';
import { getCrisisResources } from '../../../lib/api/crisis';

export default function CrisisScreen() {
  const [resources, setResources] = useState<CrisisResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try { setResources(await getCrisisResources()); } catch { /* ignore */ }
  };

  useEffect(() => { fetch().finally(() => setLoading(false)); }, []);
  const refresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  const renderResource = ({ item }: { item: CrisisResource }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <View style={[styles.typeBadge, { backgroundColor: '#EF444418' }]}>
            <Ionicons name="call-outline" size={14} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
          </View>
        </View>
        {item.available24x7 && (
          <View style={styles.badge24}><Text style={styles.badge24Text}>24/7</Text></View>
        )}
      </View>

      {item.category.length > 0 && (
        <View style={styles.tags}>
          {item.category.map(c => <View key={c} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>)}
        </View>
      )}

      <View style={styles.contactRow}>
        {item.phoneNumber && (
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${item.phoneNumber}`)}>
            <Ionicons name="call" size={16} color={COLORS.white} />
            <Text style={styles.contactBtnText}>Call</Text>
          </TouchableOpacity>
        )}
        {item.whatsappNumber && (
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#25D366' }]} onPress={() => Linking.openURL(`https://wa.me/${item.whatsappNumber}`)}>
            <Ionicons name="logo-whatsapp" size={16} color={COLORS.white} />
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
        {item.website && (
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#3B82F6' }]} onPress={() => Linking.openURL(item.website!)}>
            <Ionicons name="globe-outline" size={16} color={COLORS.white} />
            <Text style={styles.contactBtnText}>Website</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.country}{item.state ? `, ${item.state}` : ''}</Text>
        {item.languages.length > 0 && <Text style={styles.metaText}>{item.languages.join(', ')}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crisis Resources</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.banner}>
        <Ionicons name="heart" size={20} color="#EF4444" />
        <Text style={styles.bannerText}>If you or someone you know is in immediate danger, call your local emergency number.</Text>
      </View>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, padding: 14, backgroundColor: '#EF444410', borderRadius: 12, borderWidth: 1, borderColor: '#EF444430' },
  bannerText: { fontSize: 13, color: '#EF4444', flex: 1, lineHeight: 18 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  typeBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badge24: { backgroundColor: '#EF444418', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badge24Text: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: COLORS.inputBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, color: COLORS.textSecondary },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
