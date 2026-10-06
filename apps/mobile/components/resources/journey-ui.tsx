import React, { memo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../../lib/constants';
import {
  ENGAGEMENT_LABELS,
  HELP_COLORS,
  HELP_LABELS,
  JourneyItemStatus,
  STATUS_COLORS,
  domainColor,
  domainLabel,
} from '../../lib/journey';
import type { JourneyChild, LibraryCard, ResourceKind } from '../../lib/api/resource-journey';

export function ageOf(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

export function dayLabel(date: string): string {
  const d = new Date(date);
  const diff = Math.round((new Date(new Date().toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Chip({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress}>
      <Text style={[s.chipText, active && s.chipTextActive]}>
        {label}
        {count != null ? `  ${count}` : ''}
      </Text>
    </TouchableOpacity>
  );
}

export function ChildPicker({ items, value, onChange }: { items: JourneyChild[]; value: string; onChange: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {items.map((c) => {
        const age = ageOf(c.dateOfBirth);
        return <Chip key={c.id} label={`${c.firstName}${age != null ? ` · ${age}y` : ''}`} active={c.id === value} onPress={() => onChange(c.id)} />;
      })}
    </ScrollView>
  );
}

export function DomainTag({ domain }: { domain: string | null | undefined }) {
  if (!domain) return null;
  const c = domainColor(domain);
  return (
    <View style={[s.tag, { backgroundColor: c + '18' }]}>
      <View style={[s.dot, { backgroundColor: c }]} />
      <Text style={[s.tagText, { color: c }]}>{domainLabel(domain)}</Text>
    </View>
  );
}

export function StatusTag({ status }: { status: JourneyItemStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <View style={[s.tag, { backgroundColor: c.bg }]}>
      <Text style={[s.tagText, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

export const HelpSquares = memo(function HelpSquares({ logs }: { logs: { help: number }[] }) {
  if (!logs.length) return null;
  return (
    <View style={s.squares}>
      {logs.slice(-12).map((l, i) => (
        <View key={i} style={[s.square, { backgroundColor: HELP_COLORS[l.help] }]} />
      ))}
    </View>
  );
});

export const ResourceCardView = memo(function ResourceCardView({
  card,
  childName,
  onSave,
  onTried,
  onOpen,
}: {
  card: LibraryCard;
  childName: string;
  onSave: (c: LibraryCard) => void;
  onTried: (c: LibraryCard) => void;
  onOpen: (c: LibraryCard) => void;
}) {
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => onOpen(card)}>
      <View style={s.row}>
        <DomainTag domain={card.domains[0]} />
        {card.matchesScreening && (
          <View style={[s.tag, { backgroundColor: COLORS.teal + '14' }]}>
            <Text style={[s.tagText, { color: COLORS.teal }]}>Matches screening</Text>
          </View>
        )}
      </View>
      <Text style={s.meta}>
        {card.type}
        {card.durationMinutes ? ` · ${card.durationMinutes} min` : ''}
      </Text>
      <Text style={s.title}>{card.title}</Text>
      {card.practises ? <Text style={s.body}>Practises: {card.practises}</Text> : null}
      <Text style={s.small}>
        {[card.ageMin != null || card.ageMax != null ? `Ages ${card.ageMin ?? '?'}–${card.ageMax ?? '?'}` : null, card.source]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <View style={[s.row, { marginTop: 10 }]}>
        <TouchableOpacity style={s.primaryBtn} onPress={() => onTried(card)}>
          <Text style={s.primaryBtnText}>I tried this</Text>
        </TouchableOpacity>
        {card.savedItemId ? (
          <Text style={s.savedText}>Saved for {childName}</Text>
        ) : (
          <TouchableOpacity style={s.secondaryBtn} onPress={() => onSave(card)}>
            <Text style={s.secondaryBtnText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

export interface LogTarget {
  kind: ResourceKind;
  resourceId: string;
  title: string;
}

/** "How did it go?" bottom sheet. Today and the previous six days as quick picks. */
export function LogSheet({
  target,
  childName,
  onClose,
  onSubmit,
}: {
  target: LogTarget | null;
  childName: string;
  onClose: () => void;
  onSubmit: (v: { date: string; help: number; engagement: number; note?: string }) => Promise<void>;
}) {
  const [daysBack, setDaysBack] = useState(0);
  const [help, setHelp] = useState<number | null>(null);
  const [engagement, setEngagement] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setDaysBack(0);
      setHelp(null);
      setEngagement(null);
      setNote('');
    }
  }, [target]);

  const submit = async () => {
    if (help === null || engagement === null) return;
    setSaving(true);
    try {
      const d = new Date();
      d.setDate(d.getDate() - daysBack);
      d.setHours(12, 0, 0, 0);
      await onSubmit({ date: d.toISOString(), help, engagement, note: note.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={s.sheetTitle}>How did it go with {childName}?</Text>
          <Text style={s.small}>{target?.title}</Text>

          <Text style={s.label}>When</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
              return <Chip key={i} label={label} active={daysBack === i} onPress={() => setDaysBack(i)} />;
            })}
          </ScrollView>

          <Text style={s.label}>How much help did {childName} need?</Text>
          <View style={s.row}>
            {HELP_LABELS.map((l, i) => (
              <TouchableOpacity key={l} style={[s.option, help === i && s.optionActive]} onPress={() => setHelp(i)}>
                <View style={[s.square, { backgroundColor: HELP_COLORS[i] }]} />
                <Text style={s.optionText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>How engaged were they?</Text>
          <View style={s.row}>
            {ENGAGEMENT_LABELS.map((l, i) => (
              <TouchableOpacity key={l} style={[s.option, engagement === i && s.optionActive]} onPress={() => setEngagement(i)}>
                <Text style={s.optionText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Anything worth remembering? (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
            placeholder="e.g. Used the picture strip on the table"
            style={s.input}
          />

          <TouchableOpacity
            style={[s.primaryBtn, s.saveBtn, (help === null || engagement === null || saving) && { opacity: 0.5 }]}
            disabled={help === null || engagement === null || saving}
            onPress={submit}
          >
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.primaryBtnText}>Save log</Text>}
          </TouchableOpacity>
          <Text style={[s.small, { textAlign: 'center', marginTop: 8 }]}>Added to {childName}’s private progress</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  squares: { flexDirection: 'row', gap: 4 },
  square: { width: 14, height: 14, borderRadius: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  body: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  small: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  primaryBtn: { backgroundColor: COLORS.teal, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center' },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  secondaryBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  secondaryBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  savedText: { color: COLORS.teal, fontWeight: '600', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  optionActive: { borderColor: COLORS.teal, backgroundColor: COLORS.teal + '12' },
  optionText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: 'top', fontSize: 14, color: COLORS.text },
  saveBtn: { marginTop: 20, paddingVertical: 13 },
});
