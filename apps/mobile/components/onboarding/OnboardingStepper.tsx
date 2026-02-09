import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';
import { OnboardingScreenView } from './OnboardingScreen';
import type { OnboardingScreenConfig } from '../../lib/onboarding-screens';

const { width } = Dimensions.get('window');

interface Props {
  screens: OnboardingScreenConfig[];
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingStepper({ screens, onComplete, onSkip }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = screens.length;
  const isLastStep = currentStep === totalSteps - 1;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / width);
      setCurrentStep(page);
    },
    [],
  );

  const goToStep = useCallback((step: number) => {
    scrollRef.current?.scrollTo({ x: step * width, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      goToStep(currentStep + 1);
    }
  }, [isLastStep, currentStep, onComplete, goToStep]);

  const handleBack = useCallback(() => {
    goToStep(Math.max(0, currentStep - 1));
  }, [currentStep, goToStep]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip */}
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Screens */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
        style={styles.scrollView}
      >
        {screens.map((screen, i) => (
          <OnboardingScreenView key={i} screen={screen} />
        ))}
      </ScrollView>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {screens.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToStep(i)}>
            <View
              style={[
                styles.dot,
                i === currentStep ? styles.dotActive : styles.dotInactive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <View style={styles.navSide}>
          {currentStep > 0 && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleNext}>
          <LinearGradient
            colors={[COLORS.mint, COLORS.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextText}>
              {isLastStep ? 'Get Started' : 'Next'}
            </Text>
            {!isLastStep && (
              <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.teal,
  },
  dotInactive: {
    width: 8,
    backgroundColor: COLORS.border,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  navSide: {
    width: 80,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 4,
  },
});
