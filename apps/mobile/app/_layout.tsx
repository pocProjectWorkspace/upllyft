import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '../contexts/auth-context';
import { usePushNotificationListener } from '../hooks/use-push-notifications';

function PushNotificationHandler() {
  usePushNotificationListener();
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PushNotificationHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
