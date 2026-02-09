import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { createQuestion } from '../../../lib/api/questions';

export default function AskQuestionScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and description are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const question = await createQuestion(title.trim(), content.trim(), tags.length ? tags : undefined);
      router.replace({ pathname: '/(main)/(community)/question-detail', params: { id: question.id } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ask a Question</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading || !title.trim() || !content.trim()}>
          {loading ? <ActivityIndicator size="small" color={COLORS.teal} /> : (
            <Text style={[styles.postBtn, (!title.trim() || !content.trim()) && { opacity: 0.4 }]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What's your question?"
            placeholderTextColor={COLORS.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide details to help others answer..."
            placeholderTextColor={COLORS.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
          />

          <Text style={styles.label}>Tags (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. anxiety, CBT, child-therapy"
            placeholderTextColor={COLORS.textSecondary}
            value={tagsInput}
            onChangeText={setTagsInput}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  postBtn: { fontSize: 16, fontWeight: '600', color: COLORS.teal },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 14, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  errorText: { fontSize: 13, color: '#EF4444', marginBottom: 8 },
});
