import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../lib/constants';
import { useAuth } from '../../contexts/auth-context';

export default function MainLayout() {
  const { isProfessional } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.teal,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
        },
        headerShown: false,
      }}
    >
      {isProfessional ? (
        <>
          {/* Therapist tab order: Sessions, Screening, Feeds, Community, Profile */}
          <Tabs.Screen
            name="(marketplace)"
            options={{
              title: 'Sessions',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(tools)"
            options={{
              title: 'Screening',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="pulse-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(home)"
            options={{
              title: 'Feeds',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(community)"
            options={{
              title: 'Community',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(profile)"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
        </>
      ) : (
        <>
          {/* Parent tab order: Feeds, Screening, Book Session, Community, Profile */}
          <Tabs.Screen
            name="(home)"
            options={{
              title: 'Feeds',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(tools)"
            options={{
              title: 'Screening',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="pulse-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(marketplace)"
            options={{
              title: 'Book Session',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="storefront-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(community)"
            options={{
              title: 'Community',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(profile)"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
    </Tabs>
  );
}
