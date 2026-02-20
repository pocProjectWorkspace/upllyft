import { apiClient } from '@upllyft/api-client';

export interface MiraCard {
  type: 'therapist' | 'community' | 'organisation' | 'evidence' | 'conversation' | 'screening_prompt';
  data: any;
}

export interface MiraAction {
  label: string;
  url: string;
  type: 'booking' | 'community' | 'screening' | 'resource' | 'insight';
}

export interface MiraResponse {
  text: string;
  cards?: MiraCard[];
  choices?: string[];
  actions?: MiraAction[];
  sentiment?: 'supportive' | 'informational' | 'encouraging' | 'concerned';
}

export interface MiraMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: MiraCard[] | null;
  choices?: string[] | null;
  actions?: MiraAction[] | null;
  sentiment?: string | null;
  createdAt: string;
}

export interface MiraConversationSummary {
  id: string;
  title: string | null;
  lastMessage: string;
  updatedAt: string;
  childId: string | null;
}

export interface MiraConversationFull {
  id: string;
  title: string | null;
  childId: string | null;
  child?: { id: string; firstName: string; dateOfBirth: string; gender: string } | null;
  messages: MiraMessage[];
  createdAt: string;
  updatedAt: string;
}

export async function sendMiraMessage(
  message: string,
  conversationId?: string,
  childId?: string,
): Promise<{ conversationId: string; response: MiraResponse }> {
  const { data } = await apiClient.post<{ success: boolean; data: { conversationId: string; response: MiraResponse } }>(
    '/mira/chat',
    { message, conversationId, childId },
  );
  return data.data;
}

export async function getMiraConversations(): Promise<MiraConversationSummary[]> {
  const { data } = await apiClient.get<{ success: boolean; data: MiraConversationSummary[] }>(
    '/mira/conversations',
  );
  return data.data;
}

export async function getMiraConversation(id: string): Promise<MiraConversationFull> {
  const { data } = await apiClient.get<{ success: boolean; data: MiraConversationFull }>(
    `/mira/conversations/${id}`,
  );
  return data.data;
}

export async function deleteMiraConversation(id: string): Promise<void> {
  await apiClient.delete(`/mira/conversations/${id}`);
}

export interface MiraStreamCallbacks {
  onConversationId: (id: string) => void;
  onToken: (text: string) => void;
  onStructured: (data: { cards?: MiraCard[]; choices?: string[]; actions?: MiraAction[]; sentiment?: string }) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamMiraChat(
  message: string,
  callbacks: MiraStreamCallbacks,
  conversationId?: string,
  childId?: string,
): Promise<void> {
  // Get auth token for the fetch request
  const token =
    document.cookie.match(/upllyft_access_token=([^;]+)/)?.[1] ||
    localStorage.getItem('upllyft_access_token');

  const response = await fetch('/api/mira/chat-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversationId, childId }),
  });

  if (!response.ok || !response.body) {
    callbacks.onError('Failed to connect to Mira');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines
    const lines = buffer.split('\n');
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const event = JSON.parse(trimmed.slice(6));

        switch (event.type) {
          case 'conversation':
            callbacks.onConversationId(event.data.conversationId);
            break;
          case 'token':
            callbacks.onToken(event.data.text);
            break;
          case 'structured':
            callbacks.onStructured(event.data);
            break;
          case 'done':
            callbacks.onDone();
            break;
          case 'error':
            callbacks.onError(event.data.message || 'Something went wrong');
            break;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }
}
