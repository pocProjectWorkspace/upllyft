import { Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '../contexts/auth-context';
import { useOnboarding } from '../hooks/use-onboarding';
import { COLORS } from '../lib/constants';
import { OnboardingStepper } from '../components/onboarding/OnboardingStepper';
import { parentScreens, therapistScreens } from '../lib/onboarding-screens';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  const { flow, loading: onboardingLoading, dismiss } = useOnboarding();

  if (loading || (isAuthenticated && onboardingLoading)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (flow) {
    const screens = flow === 'parent' ? parentScreens : therapistScreens;
    return (
      <OnboardingStepper
        screens={screens}
        onComplete={dismiss}
        onSkip={dismiss}
      />
    );
  }

  return <Redirect href="/(main)/(home)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
