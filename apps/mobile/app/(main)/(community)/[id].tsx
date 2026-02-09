import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../../lib/constants';
import { PostType } from '../../../lib/types/community';
import { formatRelativeTime } from '../../../lib/utils';
import { usePostDetail } from '../../../hooks/use-post-detail';
import { useVoteBookmark } from '../../../hooks/use-vote-bookmark';
import AuthorBadge from '../../../components/community/AuthorBadge';
import CommentItem from '../../../components/community/CommentItem';
import CommentInput from '../../../components/community/CommentInput';

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

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { post, comments, loading, error, refresh, addComment } =
    usePostDetail(id!);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const vote = useVoteBookmark(id!, {
    upvotes: post?.upvotes ?? 0,
    downvotes: post?.downvotes ?? 0,
    userVote: post?.userVote ?? null,
    isBookmarked: post?.isBookmarked ?? false,
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Post not found'}</Text>
        <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[post.type] || COLORS.teal;

  const handleSubmitComment = async (content: string) => {
    await addComment(content, replyTo ?? undefined);
    setReplyTo(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {TYPE_LABELS[post.type] || 'Post'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Type badge + time */}
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: typeColor + '18' }]}>
            <Text style={[styles.badgeText, { color: typeColor }]}>
              {TYPE_LABELS[post.type] || post.type}
            </Text>
          </View>
          <Text style={styles.time}>{formatRelativeTime(post.createdAt)}</Text>
        </View>

        <Text style={styles.title}>{post.title}</Text>
        <AuthorBadge author={post.author} size="medium" />

        <Text style={styles.content}>{post.content}</Text>

        {/* Tags */}
        {post.tags.length > 0 && (
          <View style={styles.tags}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Vote / bookmark bar */}
        <View style={styles.actionBar}>
          <View style={styles.voteGroup}>
            <TouchableOpacity onPress={() => vote.toggleVote(1)} hitSlop={8}>
              <Ionicons
                name={vote.userVote === 1 ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                size={24}
                color={vote.userVote === 1 ? COLORS.teal : COLORS.textSecondary}
              />
            </TouchableOpacity>
            <Text style={styles.voteCount}>
              {vote.upvotes - vote.downvotes}
            </Text>
            <TouchableOpacity onPress={() => vote.toggleVote(-1)} hitSlop={8}>
              <Ionicons
                name={vote.userVote === -1 ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                size={24}
                color={vote.userVote === -1 ? COLORS.error : COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={vote.toggleBookmark} hitSlop={8}>
            <Ionicons
              name={vote.isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={vote.isBookmarked ? COLORS.teal : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>
        </View>
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            onReply={(cId) => setReplyTo(cId)}
          />
        ))}
      </ScrollView>

      <CommentInput
        onSubmit={handleSubmitComment}
        replyingTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  time: { fontSize: 12, color: COLORS.textSecondary },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  content: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    marginTop: 16,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: { fontSize: 12, color: COLORS.textSecondary },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  voteGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voteCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 28,
    textAlign: 'center',
  },
  commentsHeader: { marginTop: 20, marginBottom: 8 },
  commentsTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  errorText: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: COLORS.teal,
    borderRadius: 20,
  },
  retryText: { color: COLORS.white, fontWeight: '600' },
});
