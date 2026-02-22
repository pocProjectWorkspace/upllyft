import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
  markAsRead,
} from '@/lib/api/messaging';

const keys = {
  conversations: ['messaging', 'conversations'] as const,
  messages: (id: string) => ['messaging', 'messages', id] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: keys.conversations,
    queryFn: getConversations,
  });
}

export function useMessages(conversationId: string | null, page = 1) {
  return useQuery({
    queryKey: [...keys.messages(conversationId ?? ''), page],
    queryFn: () => getMessages(conversationId!, page),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      sendMessage(conversationId, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.messages(vars.conversationId) });
      qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => markAsRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });
}

export function useCreateOrGetConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipientId: string) => createOrGetConversation(recipientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });
}

export function useUnreadCount() {
  const { data } = useConversations();
  if (!data) return 0;
  return data.reduce((sum, conv) => sum + conv.unreadCount, 0);
}
