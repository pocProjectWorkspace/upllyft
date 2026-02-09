import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS } from '../../lib/constants';
import { Post, PostType } from '../../lib/types/community';
import { formatRelativeTime } from '../../lib/utils';
import { useVoteBookmark } from '../../hooks/use-vote-bookmark';
import AuthorBadge from './AuthorBadge';

const TYPE_COLORS: Record<PostType, string> = {
  DISCUSSION: '#0D9488',
  QUESTION: '#3B82F6',
  CASE_STUDY: '#8B5CF6',
  RESOURCE: '#F59E0B',
  ANNOUNCEMENT: '#6366F1',
  STORY: '#EC4899',
};

const TYPE_LABELS: Record<PostType, string> = {
  DISCUSSION: 'Discussion',
  QUESTION: 'Q&A',
  CASE_STUDY: 'Case Study',
  RESOURCE: 'Resource',
  ANNOUNCEMENT: 'Announcement',
  STORY: 'Story',
};

interface Props {
  post: Post;
}

export default function PostCard({ post }: Props) {
  const { upvotes, downvotes, userVote, isBookmarked, toggleVote, toggleBookmark } =
    useVoteBookmark(post.id, {
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      userVote: post.userVote ?? null,
      isBookmarked: post.isBookmarked ?? false,
    });

  const typeColor = TYPE_COLORS[post.type] || COLORS.teal;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/(main)/(community)/${post.id}`)}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: typeColor + '18' }]}>
          <Text style={[styles.badgeText, { color: typeColor }]}>
            {TYPE_LABELS[post.type] || post.type}
          </Text>
        </View>
        <Text style={styles.time}>{formatRelativeTime(post.createdAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={styles.snippet} numberOfLines={2}>
        {post.content}
      </Text>

      <AuthorBadge author={post.author} />

      <View style={styles.actions}>
        <View style={styles.voteGroup}>
          <TouchableOpacity onPress={() => toggleVote(1)} hitSlop={8}>
            <Ionicons
              name={userVote === 1 ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={20}
              color={userVote === 1 ? COLORS.teal : COLORS.textSecondary}
            />
          </TouchableOpacity>
          <Text style={styles.voteCount}>{upvotes - downvotes}</Text>
          <TouchableOpacity onPress={() => toggleVote(-1)} hitSlop={8}>
            <Ionicons
              name={userVote === -1 ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
              size={20}
              color={userVote === -1 ? COLORS.error : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{post.commentCount ?? post._count?.comments ?? 0}</Text>
        </View>

        <TouchableOpacity onPress={toggleBookmark} hitSlop={8}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isBookmarked ? COLORS.teal : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  time: { fontSize: 12, color: COLORS.textSecondary },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  snippet: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  voteGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voteCount: { fontSize: 13, fontWeight: '600', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: COLORS.textSecondary },
});
