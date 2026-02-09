import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { getAiUsage } from '../../../lib/api/tools';
import { AiUsage } from '../../../lib/types/tools';

const SEGMENTS = ['Screening', 'AI Insights'] as const;

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
}

const SCREENINGS: ToolItem[] = [
  { id: '1', title: 'PHQ-9 Depression Screening', description: 'Patient Health Questionnaire for depression severity', icon: 'clipboard-outline', route: '/(main)/(tools)/assessment' },
  { id: '2', title: 'GAD-7 Anxiety Assessment', description: 'Generalized Anxiety Disorder scale', icon: 'pulse-outline', route: '/(main)/(tools)/assessment' },
  { id: '3', title: 'PCL-5 PTSD Checklist', description: 'Post-Traumatic Stress Disorder screening', icon: 'shield-outline', route: '/(main)/(tools)/assessment' },
  { id: '4', title: 'AUDIT Alcohol Use', description: 'Alcohol Use Disorders Identification Test', icon: 'medical-outline', route: '/(main)/(tools)/assessment' },
];

const AI_TOOLS: ToolItem[] = [
  { id: 'clinical', title: 'Clinical Insights', description: 'AI-powered clinical case analysis and recommendations', icon: 'medkit-outline', route: '/(main)/(tools)/ai-chat' },
  { id: 'summarize', title: 'Content Summarizer', description: 'AI-powered summarization of clinical notes and articles', icon: 'sparkles-outline', route: '/(main)/(tools)/ai-tool' },
  { id: 'insights', title: 'Insight Extractor', description: 'Extract key insights from patient data or research', icon: 'analytics-outline', route: '/(main)/(tools)/ai-tool' },
  { id: 'resources', title: 'Resource Finder', description: 'Get AI-suggested resources for any mental health topic', icon: 'library-outline', route: '/(main)/(tools)/ai-tool' },
];

export default function ToolsScreen() {
  const [activeSegment, setActiveSegment] = useState<(typeof SEGMENTS)[number]>('Screening');
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);

  useEffect(() => {
    getAiUsage().then(setAiUsage).catch(() => {});
  }, []);

  const data = activeSegment === 'Screening' ? SCREENINGS : AI_TOOLS;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Tools</Text>

      <View style={styles.segmented}>
        {SEGMENTS.map(seg => (
          <TouchableOpacity key={seg} style={[styles.segment, activeSegment === seg && styles.segmentActive]} onPress={() => setActiveSegment(seg)}>
            <Text style={[styles.segmentText, activeSegment === seg && styles.segmentTextActive]}>{seg}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSegment === 'AI Insights' && aiUsage && (
        <View style={styles.usageBanner}>
          <Ionicons name="flash-outline" size={16} color={COLORS.teal} />
          <Text style={styles.usageText}>{aiUsage.remainingToday} / {aiUsage.dailyLimit} AI requests remaining today</Text>
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
              if (item.route) {
                router.push({ pathname: item.route as any, params: { toolId: item.id, toolName: item.title } });
              }
            }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={22} color={COLORS.teal} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, padding: 20, paddingBottom: 12 },
  segmented: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 3, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.teal },
  usageBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, backgroundColor: COLORS.teal + '10', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  usageText: { fontSize: 13, color: COLORS.teal, fontWeight: '500' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.teal + '14', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
