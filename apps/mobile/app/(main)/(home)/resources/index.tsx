import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../../contexts/auth-context';
import { COLORS, WEB_URL } from '../../../../lib/constants';
import { HELP_LABELS, ENGAGEMENT_LABELS, HELP_COLORS, JOURNEY_DOMAINS, domainLabel } from '../../../../lib/journey';
import { logTry, saveItem, setMastered, type ChildItem, type LibraryCard } from '../../../../lib/api/resource-journey';
import {
  useJourneyChildren,
  useJourneyItems,
  useJourneyLibrary,
  useJourneyProgress,
  useJourneyScreening,
} from '../../../../hooks/use-resource-journey';
import { LegacyResourcesList } from '../../../../components/resources/legacy-resources-list';
import {
  ChildPicker,
  Chip,
  DomainTag,
  HelpSquares,
  LogSheet,
  ResourceCardView,
  StatusTag,
  dayLabel,
  s as ui,
  type LogTarget,
} from '../../../../components/resources/journey-ui';

type Tab = 'library' | 'mine' | 'progress';
const TYPES = ['All', 'Guide', 'Worksheet', 'Video', 'Social story', 'Printable'];

/** Parents get the Resources journey; other roles keep the plain library list. */
export default function ResourcesScreen() {
  const { user } = useAuth();
  if (user && user.role !== 'USER') return <LegacyResourcesList />;
  return <JourneyScreen />;
}

function JourneyScreen() {
  const children = useJourneyChildren();
  const [pickedId, setPickedId] = useState('');
  const childId = pickedId || children.data?.[0]?.id || '';
  const child = children.data?.find((c) => c.id === childId);
  const childName = child?.firstName ?? 'your child';
  const [tab, setTab] = useState<Tab>('library');
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);

  // Bumped after a write so every tab reloads what changed.
  const [version, setVersion] = useState(0);
  const changed = () => setVersion((v) => v + 1);

  const openCard = useCallback((card: LibraryCard) => {
    router.push({ pathname: '/(main)/(home)/resources/[id]', params: { id: card.id, card: JSON.stringify(card), childId } });
  }, [childId]);

  const submitLog = async (v: { date: string; help: number; engagement: number; note?: string }) => {
    if (!logTarget) return;
    try {
      const res = await logTry(childId, { kind: logTarget.kind, resourceId: logTarget.resourceId, ...v });
      setLogTarget(null);
      changed();
      if (res.becameMastered) Alert.alert(`${childName} mastered it!`, `Three times on their own — "${logTarget.title}" is marked Mastered.`);
    } catch (e: any) {
      Alert.alert('Could not save', e?.response?.data?.message ?? 'Please try again.');
    }
  };

  if (children.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resource Library</Text>
        <View style={{ width: 24 }} />
      </View>

      {!children.data?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Add your child to get started</Text>
          <Text style={styles.emptyText}>Resources are matched to your child’s age and screening. Add a child in your profile.</Text>
          <TouchableOpacity style={ui.primaryBtn} onPress={() => router.push('/(main)/(profile)')}>
            <Text style={ui.primaryBtnText}>Go to profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.pad}>
            <ChildPicker items={children.data} value={childId} onChange={setPickedId} />
            <View style={styles.tabs}>
              {(['library', 'mine', 'progress'] as Tab[]).map((t) => (
                <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]} numberOfLines={1}>
                    {t === 'library' ? 'Library' : t === 'mine' ? `${childName}’s` : 'Progress'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {tab === 'library' && (
            <LibraryTab key={`${childId}-${version}`} childId={childId} childName={childName} onTried={setLogTarget} onOpen={openCard} onChanged={changed} />
          )}
          {tab === 'mine' && (
            <MineTab key={`${childId}-${version}`} childId={childId} childName={childName} onTried={setLogTarget} onOpen={openCard} onChanged={changed} />
          )}
          {tab === 'progress' && <ProgressTab key={`${childId}-${version}`} childId={childId} childName={childName} />}
        </>
      )}

      <LogSheet target={logTarget} childName={childName} onClose={() => setLogTarget(null)} onSubmit={submitLog} />
    </SafeAreaView>
  );
}

function LibraryTab({
  childId,
  childName,
  onTried,
  onOpen,
  onChanged,
}: {
  childId: string;
  childName: string;
  onTried: (t: LogTarget) => void;
  onOpen: (c: LibraryCard) => void;
  onChanged: () => void;
}) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [domain, setDomain] = useState<string | null>(null);
  const [ageFit, setAgeFit] = useState(true);
  const lib = useJourneyLibrary(childId, { q: query, type, domain, ageFit });
  const screening = useJourneyScreening(childId);

  const onSave = useCallback(
    async (card: LibraryCard) => {
      try {
        await saveItem(childId, card.kind, card.id);
        lib.setData((d) => d && { ...d, items: d.items.map((i) => (i.id === card.id && i.kind === card.kind ? { ...i, savedItemId: 'saved' } : i)) });
        onChanged();
      } catch (e: any) {
        Alert.alert('Could not save', e?.response?.data?.message ?? 'Please try again.');
      }
    },
    [childId, lib, onChanged],
  );
  const onTriedCard = useCallback((c: LibraryCard) => onTried({ kind: c.kind, resourceId: c.id, title: c.title }), [onTried]);

  const header = (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      {screening.data ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Personalised from {childName}’s screening</Text>
          {screening.data.findings.length === 0 ? (
            <Text style={ui.small}>No areas need extra support right now.</Text>
          ) : (
            screening.data.findings.map((f) => (
              <TouchableOpacity key={f.domain} style={styles.finding} onPress={() => setDomain(domain === f.domain ? null : f.domain)}>
                <DomainTag domain={f.domain} />
                <Text style={styles.findingText}>{f.text}</Text>
                <Text style={ui.small}>{f.count} resources</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : !screening.loading ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Get resources matched to {childName}</Text>
          <Text style={ui.small}>Complete a short screening across all 8 areas, and we’ll point you to the resources that fit.</Text>
        </View>
      ) : null}

      <TextInput
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => setQuery(q.trim())}
        returnKeyType="search"
        placeholder="Search guides, stories and printables…"
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.row}>
        <Chip label="All areas" active={!domain} onPress={() => setDomain(null)} />
        {JOURNEY_DOMAINS.map((d) => (
          <Chip key={d.key} label={d.label} active={domain === d.key} onPress={() => setDomain(d.key)} count={lib.data?.facets.byDomain[d.key]} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.row}>
        {TYPES.map((t) => (
          <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
        ))}
        <Chip label={`Ages for ${childName}`} active={ageFit} onPress={() => setAgeFit(!ageFit)} />
      </ScrollView>
      <Text style={ui.small}>
        {lib.data?.total ?? 0} resources{domain ? ` · ${domainLabel(domain)}` : ''}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={lib.data?.items ?? []}
      keyExtractor={(c) => `${c.kind}:${c.id}`}
      renderItem={({ item }) => <ResourceCardView card={item} childName={childName} onSave={onSave} onTried={onTriedCard} onOpen={onOpen} />}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={lib.refreshing} onRefresh={lib.refresh} tintColor={COLORS.teal} />}
      ListEmptyComponent={
        lib.loading ? (
          <ActivityIndicator color={COLORS.teal} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No resources match</Text>
            <Text style={styles.emptyText}>Try another area, or turn off the age filter.</Text>
          </View>
        )
      }
    />
  );
}

function MineTab({
  childId,
  childName,
  onTried,
  onOpen,
  onChanged,
}: {
  childId: string;
  childName: string;
  onTried: (t: LogTarget) => void;
  onOpen: (c: LibraryCard) => void;
  onChanged: () => void;
}) {
  const items = useJourneyItems(childId);
  const [status, setStatus] = useState<string>('all');
  const list = useMemo(() => (items.data?.items ?? []).filter((i) => status === 'all' || i.status === status), [items.data, status]);

  const mastered = async (item: ChildItem) => {
    try {
      await setMastered(item.id, true);
      onChanged();
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    }
  };

  const renderItem = ({ item }: { item: ChildItem }) => (
    <View style={ui.card}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <DomainTag domain={item.domain} />
        <StatusTag status={item.status} />
      </View>
      <Text style={ui.title}>{item.resource?.title ?? 'Resource no longer available'}</Text>
      {item.source === 'ASSIGNED' && item.assignedBy && !item.unassigned ? (
        <Text style={[ui.small, { color: COLORS.teal }]}>Assigned by {item.assignedBy.name ?? 'your therapist'}</Text>
      ) : null}
      {item.goal || item.resource?.forText ? <Text style={ui.body}>For: {item.goal ?? item.resource?.forText}</Text> : null}
      <View style={{ marginTop: 10 }}>
        <HelpSquares logs={item.logs} />
        <Text style={ui.small}>
          {item.lastLog ? `Last tried ${dayLabel(item.lastLog.date).toLowerCase()}${item.lastLog.note ? ` · “${item.lastLog.note}”` : ''}` : 'Not tried yet'}
        </Text>
      </View>
      <View style={[ui.row, { marginTop: 10 }]}>
        {item.resource && (
          <TouchableOpacity style={ui.primaryBtn} onPress={() => onTried({ kind: item.kind, resourceId: item.resource!.id, title: item.resource!.title })}>
            <Text style={ui.primaryBtnText}>I tried this</Text>
          </TouchableOpacity>
        )}
        {item.resource && (
          <TouchableOpacity style={ui.secondaryBtn} onPress={() => onOpen(item.resource!)}>
            <Text style={ui.secondaryBtnText}>Open</Text>
          </TouchableOpacity>
        )}
        {item.status !== 'Mastered' && item.logs.length > 0 && (
          <TouchableOpacity onPress={() => mastered(item)}>
            <Text style={styles.link}>Mark mastered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={list}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={items.refreshing} onRefresh={items.refresh} tintColor={COLORS.teal} />}
      ListHeaderComponent={
        items.data?.items.length ? (
          <View style={{ gap: 10, paddingBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.row}>
              {['all', 'To try', 'Practising', 'Getting there', 'Mastered'].map((st) => (
                <Chip
                  key={st}
                  label={st === 'all' ? 'All' : st}
                  active={status === st}
                  onPress={() => setStatus(st)}
                  count={st === 'all' ? items.data!.items.length : items.data!.summary[st] ?? 0}
                />
              ))}
            </ScrollView>
            <View style={ui.row}>
              {HELP_LABELS.map((l, i) => (
                <View key={l} style={[ui.row, { gap: 4 }]}>
                  <View style={[ui.square, { backgroundColor: HELP_COLORS[i] }]} />
                  <Text style={ui.small}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        items.loading ? (
          <ActivityIndicator color={COLORS.teal} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>Save resources from the library, and they’ll show up here, ready to try.</Text>
          </View>
        )
      }
    />
  );
}

function ProgressTab({ childId, childName }: { childId: string; childName: string }) {
  const [domain, setDomain] = useState<string | null>(null);
  const progress = useJourneyProgress(childId, domain, true);
  const p = progress.data;

  return (
    <FlatList
      data={p?.timeline ?? []}
      keyExtractor={(e) => e.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={progress.refreshing} onRefresh={progress.refresh} tintColor={COLORS.teal} />}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 8 }}>
          <Text style={styles.panelTitle}>{childName}’s progress</Text>
          <Text style={ui.small}>Built from what you log after each activity. Observations at home, not a clinical assessment.</Text>
          {p && (
            <View style={styles.stats}>
              {[
                [p.stats.logged30, 'Logged · 30 days'],
                [`${p.stats.areas30}/8`, 'Areas · 30 days'],
                [p.stats.mastered, 'Mastered'],
              ].map(([v, l]) => (
                <View key={String(l)} style={styles.stat}>
                  <Text style={styles.statValue}>{v}</Text>
                  <Text style={ui.small}>{l}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.privacy}>
            <Text style={ui.body}>
              {p?.shares?.length ? `Shared with ${p.shares.map((x) => x.therapist.name ?? 'your therapist').join(', ')}` : '🔒 Private: only you can see this'}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(`${WEB_URL}/resources?child=${childId}&tab=progress`)}>
              <Text style={styles.link}>Manage sharing on the web</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.row}>
            <Chip label="All areas" active={!domain} onPress={() => setDomain(null)} />
            {JOURNEY_DOMAINS.map((d) => (
              <Chip key={d.key} label={d.label} active={domain === d.key} onPress={() => setDomain(d.key)} />
            ))}
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.timelineRow}>
          <View style={[styles.timelineDot, { backgroundColor: HELP_COLORS[item.help] }]} />
          <View style={{ flex: 1 }}>
            <Text style={ui.small}>
              {dayLabel(item.date)} · {domainLabel(item.domain)}
            </Text>
            {item.milestone ? <Text style={styles.milestone}>★ {item.milestone}</Text> : null}
            <Text style={styles.timelineTitle}>{item.title}</Text>
            <Text style={ui.small}>
              {HELP_LABELS[item.help]} · {ENGAGEMENT_LABELS[item.engagement]}
            </Text>
            {item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}
          </View>
        </View>
      )}
      ListEmptyComponent={
        progress.loading ? (
          <ActivityIndicator color={COLORS.teal} style={{ marginTop: 30 }} />
        ) : (
          <Text style={[ui.small, { textAlign: 'center', marginTop: 20 }]}>
            Nothing logged yet. Tap “I tried this” after an activity to start the timeline.
          </Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  pad: { paddingHorizontal: 20, gap: 12 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.teal },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  panel: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  finding: { gap: 4, paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  findingText: { fontSize: 13, color: COLORS.text },
  search: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  empty: { alignItems: 'center', padding: 30, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  link: { color: COLORS.teal, fontWeight: '600', fontSize: 13 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  privacy: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12, gap: 6 },
  timelineRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  milestone: { fontSize: 12, fontWeight: '700', color: '#d97706', marginTop: 2 },
  note: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
});
