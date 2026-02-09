import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { useAiChat } from '../../../hooks/use-ai-chat';

export default function AiChatScreen() {
  const { currentResult, loading, error, analyze, history, historyLoading } = useAiChat();
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleAnalyze = () => {
    if (!query.trim() || loading) return;
    analyze(query.trim());
  };

  const renderInsights = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') return <Text style={styles.resultText}>{data}</Text>;
    if (data.recommendations) {
      return (
        <View style={{ gap: 12 }}>
          {data.summary && <Text style={styles.resultText}>{data.summary}</Text>}
          {Array.isArray(data.recommendations) && data.recommendations.map((rec: any, i: number) => (
            <View key={i} style={styles.recCard}>
              <Text style={styles.recTitle}>{rec.title || rec.category || `Recommendation ${i + 1}`}</Text>
              <Text style={styles.recDesc}>{rec.description || rec.details || JSON.stringify(rec)}</Text>
            </View>
          ))}
        </View>
      );
    }
    return <Text style={styles.resultText}>{JSON.stringify(data, null, 2)}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinical Insights AI</Text>
        <TouchableOpacity onPress={() => setShowHistory(!showHistory)} hitSlop={12}>
          <Ionicons name={showHistory ? 'close' : 'time-outline'} size={22} color={COLORS.teal} />
        </TouchableOpacity>
      </View>

      {showHistory ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>History</Text>
          {historyLoading ? (
            <ActivityIndicator color={COLORS.teal} style={{ marginTop: 20 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>No previous analyses</Text>
          ) : (
            history.map(item => (
              <TouchableOpacity key={item.id} style={styles.historyCard} onPress={() => { setQuery(item.query); setShowHistory(false); }}>
                <Text style={styles.historyQuery} numberOfLines={2}>{item.query}</Text>
                <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.hint}>
              Describe a clinical case or scenario to get AI-powered insights, recommendations, and evidence-based suggestions.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Describe the clinical case or question..."
              placeholderTextColor={COLORS.textSecondary}
              value={query}
              onChangeText={setQuery}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity
              style={[styles.analyzeBtn, (!query.trim() || loading) && styles.disabled]}
              onPress={handleAnalyze}
              disabled={!query.trim() || loading}
            >
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Ionicons name="sparkles" size={18} color={COLORS.white} />
                  <Text style={styles.analyzeBtnText}>Analyze</Text>
                </>
              )}
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {currentResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Clinical Insights</Text>
                {renderInsights(currentResult.data ?? currentResult)}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20, paddingBottom: 40 },
  hint: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.text, minHeight: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.teal, paddingVertical: 14, borderRadius: 12 },
  disabled: { opacity: 0.5 },
  analyzeBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 12, textAlign: 'center' },
  resultCard: { marginTop: 20, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  resultLabel: { fontSize: 13, fontWeight: '600', color: COLORS.teal, marginBottom: 12 },
  resultText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  recCard: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  recTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  recDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },
  historyCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  historyQuery: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  historyDate: { fontSize: 12, color: COLORS.textSecondary },
});
