'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { MiraMessage, MiraConversationSummary } from '@/lib/api/mira';
import {
  streamMiraChat,
  getMiraConversations,
  getMiraConversation,
  deleteMiraConversation,
} from '@/lib/api/mira';

interface MiraState {
  isOpen: boolean;
  open: (options?: { childId?: string; prefilledMessage?: string }) => void;
  close: () => void;
  toggle: () => void;

  messages: MiraMessage[];
  conversationId: string | null;
  childId: string | null;
  setChildId: (id: string | null) => void;
  isLoading: boolean;

  sendMessage: (text: string) => Promise<void>;
  startNewConversation: () => void;
  loadConversation: (id: string) => Promise<void>;

  conversations: MiraConversationSummary[];
  loadConversations: () => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  conversationsLoading: boolean;

  showHistory: boolean;
  setShowHistory: (v: boolean) => void;

  prefilledMessage: string | null;
  clearPrefilledMessage: () => void;
}

const MiraContext = createContext<MiraState | null>(null);

export function useMira() {
  const ctx = useContext(MiraContext);
  if (!ctx) throw new Error('useMira must be used within MiraProvider');
  return ctx;
}

export function MiraProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MiraMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<MiraConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [prefilledMessage, setPrefilledMessage] = useState<string | null>(null);

  const open = useCallback((options?: { childId?: string; prefilledMessage?: string }) => {
    if (options?.childId) setChildId(options.childId);
    if (options?.prefilledMessage) setPrefilledMessage(options.prefilledMessage);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setShowHistory(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) setShowHistory(false);
      return !prev;
    });
  }, []);

  const clearPrefilledMessage = useCallback(() => setPrefilledMessage(null), []);

  // Ref to track the streaming assistant message ID so callbacks can update it
  const streamingMsgId = useRef<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: MiraMessage = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId || '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const assistantMsgId = `temp-${Date.now()}-a`;
    streamingMsgId.current = assistantMsgId;

    // Add user message + empty assistant placeholder
    const assistantMsg: MiraMessage = {
      id: assistantMsgId,
      conversationId: conversationId || '',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      await streamMiraChat(
        text,
        {
          onConversationId: (id) => {
            if (!conversationId) setConversationId(id);
          },
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + token }
                  : m,
              ),
            );
          },
          onStructured: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      cards: data.cards || null,
                      choices: data.choices || null,
                      actions: data.actions || null,
                      sentiment: data.sentiment || null,
                    }
                  : m,
              ),
            );
          },
          onDone: () => {
            streamingMsgId.current = null;
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: m.content || "I'm sorry, something went wrong. Could you try again?",
                      choices: ['Try again'],
                    }
                  : m,
              ),
            );
            streamingMsgId.current = null;
          },
        },
        conversationId || undefined,
        childId || undefined,
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: "I'm sorry, something went wrong. Could you try again?",
                choices: ['Try again'],
              }
            : m,
        ),
      );
      streamingMsgId.current = null;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, childId]);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setShowHistory(false);
    try {
      const conv = await getMiraConversation(id);
      setConversationId(conv.id);
      setChildId(conv.childId || null);
      setMessages(conv.messages);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const list = await getMiraConversations();
      setConversations(list);
    } catch {
      // ignore
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  const removeConversation = useCallback(async (id: string) => {
    try {
      await deleteMiraConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        startNewConversation();
      }
    } catch {
      // ignore
    }
  }, [conversationId, startNewConversation]);

  return (
    <MiraContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        messages,
        conversationId,
        childId,
        setChildId,
        isLoading,
        sendMessage,
        startNewConversation,
        loadConversation,
        conversations,
        loadConversations,
        removeConversation,
        conversationsLoading,
        showHistory,
        setShowHistory,
        prefilledMessage,
        clearPrefilledMessage,
      }}
    >
      {children}
    </MiraContext.Provider>
  );
}
