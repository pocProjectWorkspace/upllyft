import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../lib/constants';
import { Author } from '../../lib/types/community';

interface Props {
  author: Author;
  size?: 'small' | 'medium';
}

export default function AuthorBadge({ author, size = 'small' }: Props) {
  const displayName = author.name || 'Anonymous';
  const initial = displayName.charAt(0).toUpperCase();
  const avatarSize = size === 'medium' ? 32 : 24;
  const fontSize = size === 'medium' ? 14 : 12;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatar,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        ]}
      >
        <Text style={[styles.initial, { fontSize: avatarSize * 0.45 }]}>
          {initial}
        </Text>
      </View>
      <View>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { fontSize }]} numberOfLines={1}>
            {displayName}
          </Text>
          {author.verificationStatus === 'VERIFIED' && (
            <Ionicons
              name="checkmark-circle"
              size={fontSize}
              color={COLORS.teal}
              style={{ marginLeft: 3 }}
            />
          )}
        </View>
        {author.role && (
          <Text style={styles.role} numberOfLines={1}>
            {author.role}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: COLORS.white, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontWeight: '600', color: COLORS.text },
  role: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
});
