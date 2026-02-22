import { apiClient } from '@upllyft/api-client';

// ── Types ──

export interface ConversationParty {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

export interface ConversationListItem {
  id: string;
  otherParty: ConversationParty;
  lastMessage: {
    body: string;
    createdAt: string;
    isOwn: boolean;
  } | null;
  unreadCount: number;
}

export interface MessageSender {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: MessageSender;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ── API Functions ──

export async function getConversations(): Promise<ConversationListItem[]> {
  const { data } = await apiClient.get('/api/messaging/conversations');
  return data;
}

export async function createOrGetConversation(
  recipientId: string,
): Promise<{ conversationId: string; isNew: boolean }> {
  const { data } = await apiClient.post('/api/messaging/conversations', {
    recipientId,
  });
  return data;
}

export async function getMessages(
  conversationId: string,
  page = 1,
  limit = 30,
): Promise<MessagesResponse> {
  const { data } = await apiClient.get(
    `/api/messaging/conversations/${conversationId}/messages`,
    { params: { page, limit } },
  );
  return data;
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<Message> {
  const { data } = await apiClient.post(
    `/api/messaging/conversations/${conversationId}/messages`,
    { body },
  );
  return data;
}

export async function markAsRead(
  conversationId: string,
): Promise<{ markedCount: number }> {
  const { data } = await apiClient.patch(
    `/api/messaging/conversations/${conversationId}/read`,
  );
  return data;
}
