import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../lib/constants';
import type { OnboardingScreenConfig } from '../../lib/onboarding-screens';

const { width } = Dimensions.get('window');

interface Props {
  screen: OnboardingScreenConfig;
}

export function OnboardingScreenView({ screen }: Props) {
  return (
    <View style={[styles.container, { width }]}>
      <LinearGradient
        colors={[COLORS.mint, COLORS.teal]}
        style={styles.iconCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={screen.iconName as any} size={48} color={COLORS.white} />
      </LinearGradient>

      <Text style={styles.title}>{screen.title}</Text>

      {screen.subtitle && <Text style={styles.subtitle}>{screen.subtitle}</Text>}

      {screen.points.length > 0 && (
        <View style={styles.pointsList}>
          {screen.points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <View style={styles.dot} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  pointsList: {
    width: '100%',
    marginTop: 16,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.teal,
    marginTop: 6,
    marginRight: 12,
  },
  pointText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
