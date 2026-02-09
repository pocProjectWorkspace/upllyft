import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../lib/constants';

interface Props {
  onSubmit: (content: string) => Promise<void>;
  replyingTo?: string | null;
  onCancelReply?: () => void;
}

export default function CommentInput({ onSubmit, replyingTo, onCancelReply }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSubmit(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {replyingTo && (
        <View style={styles.replyBar}>
          <Text style={styles.replyText}>Replying to comment</Text>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor={COLORS.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending}>
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.teal} />
          ) : (
            <Ionicons
              name="send"
              size={22}
              color={text.trim() ? COLORS.teal : COLORS.border}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
  },
  replyText: { fontSize: 12, color: COLORS.teal, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 80,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
