import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { Question, Answer } from '../../../lib/types/questions';
import { getQuestion, getAnswers, createAnswer, voteAnswer, acceptAnswer } from '../../../lib/api/questions';
import { formatRelativeTime } from '../../../lib/utils';

export default function QuestionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [q, a] = await Promise.all([getQuestion(id!), getAnswers(id!)]);
        setQuestion(q);
        setAnswers(a);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      const newAnswer = await createAnswer(id!, answerText.trim());
      setAnswers(prev => [...prev, newAnswer]);
      setAnswerText('');
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const handleVote = async (answerId: string, value: 1 | -1) => {
    try { await voteAnswer(answerId, value); } catch { /* ignore */ }
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;
  if (!question) return <SafeAreaView style={styles.container}><View style={styles.centered}><Text style={{ color: COLORS.textSecondary }}>Question not found</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.statusBadge, { backgroundColor: question.status === 'OPEN' ? COLORS.teal + '18' : COLORS.textSecondary + '18' }]}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: question.status === 'OPEN' ? COLORS.teal : COLORS.textSecondary }}>{question.status}</Text>
          </View>
          <Text style={styles.title}>{question.title}</Text>
          <Text style={styles.authorText}>{question.author?.name || 'Anonymous'} · {formatRelativeTime(question.createdAt)}</Text>
          <Text style={styles.body}>{question.content}</Text>

          {question.tags.length > 0 && (
            <View style={styles.tags}>
              {question.tags.map(t => <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>)}
            </View>
          )}

          <View style={styles.metaBar}>
            <Text style={styles.metaText}>{question.viewCount} views</Text>
            <Text style={styles.metaText}>{question.answerCount} answers</Text>
            <Text style={styles.metaText}>{question.followerCount} followers</Text>
          </View>

          {/* Answers */}
          <Text style={styles.sectionTitle}>{answers.length} Answer{answers.length !== 1 ? 's' : ''}</Text>
          {answers.map(a => (
            <View key={a.id} style={[styles.answerCard, a.isAccepted && styles.answerAccepted]}>
              {a.isAccepted && (
                <View style={styles.acceptedBadge}><Ionicons name="checkmark-circle" size={14} color={COLORS.teal} /><Text style={styles.acceptedText}>Accepted</Text></View>
              )}
              <Text style={styles.answerBody}>{a.content}</Text>
              <View style={styles.answerFooter}>
                <Text style={styles.answerAuthor}>{a.author?.name || 'Anonymous'} · {formatRelativeTime(a.createdAt)}</Text>
                <View style={styles.voteRow}>
                  <TouchableOpacity onPress={() => handleVote(a.id, 1)} hitSlop={8}>
                    <Ionicons name="chevron-up" size={20} color={COLORS.teal} />
                  </TouchableOpacity>
                  <Text style={styles.voteCount}>{a.helpfulVotes - a.notHelpfulVotes}</Text>
                  <TouchableOpacity onPress={() => handleVote(a.id, -1)} hitSlop={8}>
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Answer input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Write your answer..."
            placeholderTextColor={COLORS.textSecondary}
            value={answerText}
            onChangeText={setAnswerText}
            multiline
          />
          <TouchableOpacity onPress={handleSubmitAnswer} disabled={!answerText.trim() || submitting} style={{ opacity: answerText.trim() ? 1 : 0.4 }}>
            {submitting ? <ActivityIndicator size="small" color={COLORS.teal} /> : <Ionicons name="send" size={22} color={COLORS.teal} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  content: { padding: 20, paddingBottom: 100 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  authorText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  body: { fontSize: 15, color: COLORS.text, lineHeight: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { backgroundColor: COLORS.inputBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, color: COLORS.textSecondary },
  metaBar: { flexDirection: 'row', gap: 16, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  metaText: { fontSize: 13, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 24, marginBottom: 12 },
  answerCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  answerAccepted: { borderColor: COLORS.teal },
  acceptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  acceptedText: { fontSize: 12, fontWeight: '600', color: COLORS.teal },
  answerBody: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  answerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  answerAuthor: { fontSize: 12, color: COLORS.textSecondary },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voteCount: { fontSize: 14, fontWeight: '600', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.card },
  input: { flex: 1, fontSize: 14, color: COLORS.text, maxHeight: 80 },
});
