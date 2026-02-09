import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import { AnswerType } from '../../../lib/types/assessments';
import { useAssessmentFlow } from '../../../hooks/use-assessments';

const ANSWER_OPTIONS: { value: AnswerType; label: string; color: string }[] = [
  { value: 'YES', label: 'Yes', color: '#10B981' },
  { value: 'SOMETIMES', label: 'Sometimes', color: '#F59E0B' },
  { value: 'NOT_SURE', label: 'Not Sure', color: '#6B7280' },
  { value: 'NO', label: 'No', color: '#EF4444' },
];

export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentQuestion, currentIndex, totalQuestions, answers, tier,
    loading, submitting, error, allAnswered,
    answerQuestion, nextQuestion, prevQuestion, submit,
  } = useAssessmentFlow(id || '');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    const result = await submit();
    if (result) {
      router.replace({ pathname: '/(main)/(tools)/assessment-report', params: { id: id! } });
    }
  };

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tier {tier} Assessment</Text>
        <Text style={styles.counter}>{currentIndex + 1}/{totalQuestions}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / totalQuestions) * 100}%` }]} />
      </View>

      {currentQuestion && (
        <View style={styles.content}>
          <Text style={styles.domain}>{currentQuestion.domain}</Text>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>

          <View style={styles.options}>
            {ANSWER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionBtn, currentAnswer === opt.value && { backgroundColor: opt.color + '18', borderColor: opt.color }]}
                onPress={() => answerQuestion(currentQuestion.id, opt.value)}
              >
                <View style={[styles.optionDot, currentAnswer === opt.value && { backgroundColor: opt.color }]} />
                <Text style={[styles.optionLabel, currentAnswer === opt.value && { color: opt.color, fontWeight: '600' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.navBtn} onPress={prevQuestion} disabled={currentIndex === 0}>
          <Ionicons name="chevron-back" size={20} color={currentIndex === 0 ? COLORS.border : COLORS.text} />
          <Text style={[styles.navText, currentIndex === 0 && { color: COLORS.border }]}>Previous</Text>
        </TouchableOpacity>

        {isLastQuestion && allAnswered ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Submit</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={nextQuestion} disabled={!currentAnswer}>
            <Text style={[styles.navText, !currentAnswer && { color: COLORS.border }]}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={!currentAnswer ? COLORS.border : COLORS.text} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  counter: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  progressBar: { height: 3, backgroundColor: COLORS.border },
  progressFill: { height: 3, backgroundColor: COLORS.teal },
  content: { flex: 1, padding: 24 },
  domain: { fontSize: 13, fontWeight: '600', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  questionText: { fontSize: 18, fontWeight: '600', color: COLORS.text, lineHeight: 26, marginBottom: 32 },
  options: { gap: 12 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  optionDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border },
  optionLabel: { fontSize: 16, color: COLORS.text },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  navText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  submitBtn: { backgroundColor: COLORS.teal, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  submitText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.teal },
  backBtnText: { color: COLORS.white, fontWeight: '600' },
});
