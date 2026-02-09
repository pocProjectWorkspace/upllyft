import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';

export default function BillingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planLabel}>Current Plan</Text>
            <View style={styles.planBadge}><Text style={styles.planBadgeText}>Free</Text></View>
          </View>
          <Text style={styles.planDesc}>Basic access to Upllyft community features</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={32} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No payment methods added</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Billing History</Text>
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={32} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No billing history</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20 },
  planCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase' },
  planBadge: { backgroundColor: COLORS.teal + '18', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.teal },
  planDesc: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
