import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../../lib/constants';
import api from '../../../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export default function AvailabilityScreen() {
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/marketplace/therapists/me/profile')
      .then(r => {
        const avail = r.data.availability || {};
        const s: Record<string, DaySchedule> = {};
        DAYS.forEach(d => {
          s[d] = avail[d] || { enabled: false, startTime: '09:00', endTime: '17:00' };
        });
        setSchedule(s);
      })
      .catch(() => {
        const s: Record<string, DaySchedule> = {};
        DAYS.forEach(d => { s[d] = { enabled: false, startTime: '09:00', endTime: '17:00' }; });
        setSchedule(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (day: string) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/marketplace/therapists/me/profile', { availability: schedule });
      router.back();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.teal} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtn}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Set your weekly availability for bookings</Text>
        {DAYS.map(day => (
          <View key={day} style={styles.dayRow}>
            <View style={styles.dayLeft}>
              <Switch value={schedule[day]?.enabled} onValueChange={() => toggleDay(day)} trackColor={{ true: COLORS.teal }} />
              <Text style={[styles.dayLabel, !schedule[day]?.enabled && { color: COLORS.textSecondary }]}>{day}</Text>
            </View>
            {schedule[day]?.enabled && (
              <Text style={styles.timeText}>{schedule[day].startTime} - {schedule[day].endTime}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  saveBtn: { fontSize: 15, fontWeight: '600', color: COLORS.teal },
  content: { padding: 20 },
  hint: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayLabel: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  timeText: { fontSize: 14, color: COLORS.teal, fontWeight: '500' },
});
