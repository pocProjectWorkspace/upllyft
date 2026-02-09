import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS } from '../../lib/constants';
import { PostComment } from '../../lib/types/community';
import { formatRelativeTime } from '../../lib/utils';
import AuthorBadge from './AuthorBadge';

interface Props {
  comment: PostComment;
  depth?: number;
  onReply?: (commentId: string) => void;
}

export default function CommentItem({ comment, depth = 0, onReply }: Props) {
  const indent = Math.min(depth, 2) * 24;

  return (
    <View style={[styles.container, { marginLeft: indent }]}>
      <AuthorBadge author={comment.author} />
      <Text style={styles.content}>{comment.content}</Text>
      <View style={styles.footer}>
        <Text style={styles.time}>{formatRelativeTime(comment.createdAt)}</Text>
        {onReply && depth < 2 && (
          <TouchableOpacity onPress={() => onReply(comment.id)}>
            <Text style={styles.reply}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          onReply={onReply}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  content: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  time: { fontSize: 12, color: COLORS.textSecondary },
  reply: { fontSize: 12, color: COLORS.teal, fontWeight: '600' },
});
