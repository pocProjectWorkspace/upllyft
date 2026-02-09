import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';

import { COLORS } from '../lib/constants';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export default function GoogleSignInButton({ onPress, loading }: GoogleSignInButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.text} />
      ) : (
        <>
          <Image
            source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
            style={styles.icon}
          />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  icon: { width: 20, height: 20 },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
