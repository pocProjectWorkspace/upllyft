import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { useAssessmentReport } from '../../../hooks/use-assessments';

const LEVEL_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MODERATE: '#F59E0B',
  HIGH: '#EF4444',
  TYPICAL: '#10B981',
  CONCERN: '#F59E0B',
  SIGNIFICANT: '#EF4444',
};

export default function AssessmentReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { report, loading, error } = useAssessmentReport(id || '');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Report not available yet'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assessment Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{report.summary}</Text>
        </View>

        {report.domainScores?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Domain Scores</Text>
            {report.domainScores.map((d, i) => (
              <View key={i} style={styles.domainCard}>
                <View style={styles.domainHeader}>
                  <Text style={styles.domainName}>{d.domain}</Text>
                  <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[d.level] || COLORS.textSecondary) + '18' }]}>
                    <Text style={[styles.levelText, { color: LEVEL_COLORS[d.level] || COLORS.textSecondary }]}>{d.level}</Text>
                  </View>
                </View>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreFill, { width: `${Math.min(d.score, 100)}%`, backgroundColor: LEVEL_COLORS[d.level] || COLORS.teal }]} />
                </View>
                {d.description && <Text style={styles.domainDesc}>{d.description}</Text>}
              </View>
            ))}
          </>
        )}

        {report.flaggedAreas?.length > 0 && (
          <View style={styles.flaggedCard}>
            <Text style={styles.sectionTitle}>Flagged Areas</Text>
            {report.flaggedAreas.map((area, i) => (
              <View key={i} style={styles.flaggedItem}>
                <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                <Text style={styles.flaggedText}>{area}</Text>
              </View>
            ))}
          </View>
        )}

        {report.recommendations?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {report.recommendations.map((rec, i) => (
              <View key={i} style={styles.recItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.teal} />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  summaryText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  domainCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  domainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  domainName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  scoreBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  scoreFill: { height: 6, borderRadius: 3 },
  domainDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  flaggedCard: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A' },
  flaggedItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  flaggedText: { fontSize: 14, color: '#92400E', flex: 1 },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  recText: { fontSize: 14, color: COLORS.text, lineHeight: 20, flex: 1 },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.teal },
  btnText: { color: COLORS.white, fontWeight: '600' },
});
