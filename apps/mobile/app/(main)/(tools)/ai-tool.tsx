import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { summarizeContent, extractInsights, suggestResources } from '../../../lib/api/tools';

export default function AiToolScreen() {
  const { toolId, toolName } = useLocalSearchParams<{ toolId: string; toolName: string }>();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = toolId === 'summarize'
    ? 'Paste clinical notes or article text to summarize...'
    : toolId === 'insights'
    ? 'Paste content to extract insights from...'
    : 'Enter a mental health topic (e.g. "childhood anxiety")...';

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (toolId === 'summarize') {
        const res = await summarizeContent(input.trim());
        setResult(res.summary);
      } else if (toolId === 'insights') {
        const res = await extractInsights(input.trim());
        setResult(res.insights.join('\n\n'));
      } else if (toolId === 'resources') {
        const res = await suggestResources(input.trim());
        const items = Array.isArray(res) ? res : [];
        setResult(items.map(r => `${r.title}\n${r.description}${r.url ? `\n${r.url}` : ''}`).join('\n\n'));
      }
    } catch {
      setError('Failed to process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{toolName || 'AI Tool'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={6}
          />

          <TouchableOpacity style={[styles.submitBtn, (!input.trim() || loading) && styles.submitDisabled]} onPress={handleSubmit} disabled={!input.trim() || loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : (
              <>
                <Ionicons name="sparkles" size={18} color={COLORS.white} />
                <Text style={styles.submitText}>Analyze</Text>
              </>
            )}
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Result</Text>
              <Text style={styles.resultText}>{result}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.text, minHeight: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.teal, paddingVertical: 14, borderRadius: 12 },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 12, textAlign: 'center' },
  resultCard: { marginTop: 20, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  resultLabel: { fontSize: 13, fontWeight: '600', color: COLORS.teal, marginBottom: 8 },
  resultText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
});
