import React, { useMemo, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { COLORS, WEB_URL } from '../../../../lib/constants';
import { logTry, saveItem, type LibraryCard } from '../../../../lib/api/resource-journey';
import { DomainTag, LogSheet, s as ui, type LogTarget } from '../../../../components/resources/journey-ui';

/**
 * One resource: what it is, who it is for, and the two things a parent does with it.
 * Files open through their short-lived signed link; worksheets open on the web.
 */
export default function ResourceDetailScreen() {
  const params = useLocalSearchParams<{ id: string; card: string; childId: string }>();
  const card = useMemo<LibraryCard | null>(() => {
    try {
      return params.card ? JSON.parse(params.card) : null;
    } catch {
      return null;
    }
  }, [params.card]);
  const [saved, setSaved] = useState(!!card?.savedItemId);
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);

  if (!card) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={[ui.body, { padding: 20 }]}>This resource could not be opened.</Text>
      </SafeAreaView>
    );
  }

  const open = () => {
    if (card.kind === 'WORKSHEET') return Linking.openURL(`${WEB_URL}/resources/${card.id}`);
    if (card.fileUrl) return Linking.openURL(card.fileUrl);
    Alert.alert('Link expired', 'Go back and open it again from the library.');
  };

  const save = async () => {
    try {
      await saveItem(params.childId, card.kind, card.id);
      setSaved(true);
    } catch (e: any) {
      Alert.alert('Could not save', e?.response?.data?.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={ui.row}>
          {card.domains.map((d) => (
            <DomainTag key={d} domain={d} />
          ))}
        </View>
        <Text style={ui.meta}>
          {card.type}
          {card.durationMinutes ? ` · ${card.durationMinutes} min` : ''}
        </Text>
        <Text style={styles.title}>{card.title}</Text>
        {card.description ? <Text style={ui.body}>{card.description}</Text> : null}
        {card.practises ? <Text style={ui.body}>Practises: {card.practises}</Text> : null}
        {card.forText ? <Text style={ui.body}>For: {card.forText}</Text> : null}
        <Text style={ui.small}>
          {[card.ageMin != null || card.ageMax != null ? `Ages ${card.ageMin ?? '?'}–${card.ageMax ?? '?'}` : null, card.source]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        <TouchableOpacity style={[ui.primaryBtn, styles.big]} onPress={open}>
          <Text style={ui.primaryBtnText}>Open</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ui.secondaryBtn, styles.big]} onPress={() => setLogTarget({ kind: card.kind, resourceId: card.id, title: card.title })}>
          <Text style={ui.secondaryBtnText}>I tried this</Text>
        </TouchableOpacity>
        {saved ? (
          <Text style={[ui.savedText, { textAlign: 'center', marginTop: 12 }]}>Saved to your child’s library</Text>
        ) : (
          <TouchableOpacity style={[ui.secondaryBtn, styles.big]} onPress={save}>
            <Text style={ui.secondaryBtnText}>Save to your child’s library</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <LogSheet
        target={logTarget}
        childName="your child"
        onClose={() => setLogTarget(null)}
        onSubmit={async (v) => {
          try {
            await logTry(params.childId, { kind: card.kind, resourceId: card.id, ...v });
            setSaved(true);
            setLogTarget(null);
          } catch (e: any) {
            Alert.alert('Could not save', e?.response?.data?.message ?? 'Please try again.');
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 6 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginVertical: 4 },
  big: { marginTop: 12, paddingVertical: 13, alignItems: 'center' },
});
