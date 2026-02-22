import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { registerPushToken, removePushToken } from '../lib/api/push-notifications';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let cachedPushToken: string | null = null;

/**
 * Request push notification permission and register the device token with the API.
 * Returns the token string (or null if permission denied).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get the native device push token (FCM for Android, APNs for iOS)
  const tokenData = await Notifications.getDevicePushTokenAsync();
  const token = tokenData.data as string;
  const platform = Platform.OS as 'ios' | 'android';

  try {
    await registerPushToken(token, platform);
    cachedPushToken = token;
  } catch {
    // Non-fatal — push just won't work
  }

  return token;
}

/**
 * Unregister the current push token from the API (call before logout).
 */
export async function unregisterPushToken(): Promise<void> {
  if (!cachedPushToken) return;
  try {
    await removePushToken(cachedPushToken);
  } catch {
    // Non-fatal
  } finally {
    cachedPushToken = null;
  }
}

/**
 * Hook that listens for notification taps and navigates accordingly.
 * Call this in the root layout or main screen once the user is authenticated.
 */
export function usePushNotificationListener() {
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data?.type) return;

      switch (data.type) {
        case 'booking':
          if (data.bookingId) {
            router.push(`/(main)/bookings/${data.bookingId}` as any);
          }
          break;
        case 'message':
          if (data.conversationId) {
            router.push(`/(main)/messages/${data.conversationId}` as any);
          } else {
            router.push('/(main)/messages' as any);
          }
          break;
        case 'consent':
          if (data.consentId) {
            router.push(`/(main)/consent/${data.consentId}` as any);
          }
          break;
        default:
          // Generic — go to notifications screen
          router.push('/(main)/notifications' as any);
          break;
      }
    },
    [],
  );

  useEffect(() => {
    // Handle notification taps when the app is backgrounded/killed
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [handleNotificationResponse]);
}
