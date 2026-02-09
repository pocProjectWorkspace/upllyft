import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS } from '../../lib/constants';
import { PostType, SortOption } from '../../lib/types/community';

const TYPE_FILTERS: { label: string; value: PostType | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Discussion', value: 'DISCUSSION' },
  { label: 'Q&A', value: 'QUESTION' },
  { label: 'Case Study', value: 'CASE_STUDY' },
  { label: 'Resource', value: 'RESOURCE' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Recent', value: 'recent' },
  { label: 'Popular', value: 'popular' },
  { label: 'Trending', value: 'trending' },
];

interface Props {
  activeType: PostType | undefined;
  sort: SortOption;
  onTypeChange: (type: PostType | undefined) => void;
  onSortChange: (sort: SortOption) => void;
}

export default function FilterPills({
  activeType,
  sort,
  onTypeChange,
  onSortChange,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {TYPE_FILTERS.map((f) => {
          const active = activeType === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => onTypeChange(f.value)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {SORT_OPTIONS.map((s) => {
          const active = sort === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[styles.sortPill, active && styles.sortPillActive]}
              onPress={() => onSortChange(s.value)}
            >
              <Text
                style={[styles.sortText, active && styles.sortTextActive]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8, paddingBottom: 8 },
  row: { paddingHorizontal: 20, gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  pillText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  pillTextActive: { color: COLORS.white },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortPillActive: {
    backgroundColor: COLORS.tealDark,
    borderColor: COLORS.tealDark,
  },
  sortText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  sortTextActive: { color: COLORS.white },
});
