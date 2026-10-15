import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import api from '../lib/api';
import { COLORS, WEB_URL } from '../lib/constants';
import { useAuth } from '../contexts/auth-context';

// Legal acceptance (Legal Pack v1.1), mirroring web-main's legal-acceptance.tsx:
// the Terms / Privacy / 18+ boxes on sign-up, and a blocking prompt for anyone
// signed in who hasn't accepted the current versions.

export type LegalDocumentType = 'TERMS' | 'PRIVACY' | 'AGE_18_PLUS';

export interface LegalDocument {
  type: LegalDocumentType;
  version: string;
  edition: string;
  title: string;
  statement: string;
  url: string | null;
}

export type LegalChecked = Partial<Record<LegalDocumentType, boolean>>;

/** Current documents and their checkbox wording (public). */
export function useLegalDocuments() {
  const [documents, setDocuments] = useState<LegalDocument[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      const { data } = await api.get<{ documents: LegalDocument[] }>('/legal/documents');
      setDocuments(data.documents);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { documents, error, reload: load };
}

/** Unticked boxes, one per document; "Read" opens the full text on the web. */
export function LegalCheckboxes({
  documents,
  checked,
  onChange,
}: {
  documents: LegalDocument[];
  checked: LegalChecked;
  onChange: (type: LegalDocumentType, value: boolean) => void;
}) {
  return (
    <View style={styles.list}>
      {documents.map((d) => {
        const on = !!checked[d.type];
        return (
          <View key={d.type} style={styles.row}>
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={d.statement}
              onPress={() => onChange(d.type, !on)}
              style={styles.rowTap}
            >
              <View style={[styles.box, on && styles.boxOn]}>
                {on && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.statement}>{d.statement}</Text>
            </TouchableOpacity>
            {d.url && (
              <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}${d.url}`)}>
                <Text style={styles.read}>Read</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Blocking prompt while the signed-in user has something to accept. Mount once in the main layout. */
export function LegalAcceptanceGate() {
  const { user, logout } = useAuth();
  const [pending, setPending] = useState<LegalDocument[]>([]);
  const [checked, setChecked] = useState<LegalChecked>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ pending: LegalDocument[] }>('/legal/status');
      setPending(data.pending);
    } catch {
      // A failed check must never lock people out; it runs again next launch.
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setPending([]);
  }, [user, refresh]);

  const accept = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post<{ pending: LegalDocument[] }>('/legal/accept', {
        accepted: pending.map((d) => ({ type: d.type, version: d.version })),
      });
      setPending(data.pending);
      setChecked({});
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Couldn’t save. Please try again.');
      // A newer version may have been published meanwhile.
      refresh();
    } finally {
      setSaving(false);
    }
  };

  if (!user || pending.length === 0) return null;
  const allChecked = pending.every((d) => checked[d.type]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Please review our terms</Text>
          <Text style={styles.body}>
            To keep using Upllyft, please confirm the following. You can read each document before agreeing.
          </Text>
          <LegalCheckboxes
            documents={pending}
            checked={checked}
            onChange={(type, value) => setChecked((c) => ({ ...c, [type]: value }))}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => logout()}>
              <Text style={styles.signOut}>Sign out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!allChecked || saving}
              onPress={accept}
              style={[styles.continue, (!allChecked || saving) && styles.disabled]}
            >
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.continueText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowTap: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: COLORS.white,
  },
  boxOn: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  statement: { flex: 1, fontSize: 14, lineHeight: 20, color: COLORS.text },
  read: { fontSize: 14, lineHeight: 20, color: COLORS.teal, fontWeight: '600', textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  body: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary, marginTop: 6, marginBottom: 16 },
  error: { color: COLORS.error, fontSize: 13, marginTop: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  signOut: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  continue: { backgroundColor: COLORS.teal, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22, minWidth: 110, alignItems: 'center' },
  continueText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
