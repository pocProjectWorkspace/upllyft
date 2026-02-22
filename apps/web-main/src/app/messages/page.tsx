'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Avatar, Card } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
} from '@/hooks/use-messaging';
import type { ConversationListItem, Message } from '@/lib/api/messaging';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) {
    return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
  }
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

/* ------------------------------------------------------------------ */
/*  ConversationList                                                  */
/* ------------------------------------------------------------------ */

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">No conversations yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Messages with your therapist will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
            selectedId === conv.id
              ? 'bg-teal-50'
              : 'hover:bg-gray-50'
          }`}
        >
          <Avatar
            name={conv.otherParty.name || 'User'}
            src={conv.otherParty.avatarUrl || undefined}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`text-sm truncate ${
                conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
              }`}>
                {conv.otherParty.name || 'Unknown'}
              </p>
              {conv.lastMessage && (
                <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                  {timeAgo(conv.lastMessage.createdAt)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className={`text-xs truncate ${
                conv.unreadCount > 0 ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {conv.lastMessage
                  ? `${conv.lastMessage.isOwn ? 'You: ' : ''}${conv.lastMessage.body}`
                  : 'No messages yet'}
              </p>
              {conv.unreadCount > 0 && (
                <span className="ml-2 flex-shrink-0 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-500 px-1.5 text-[10px] font-bold text-white">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MessageThread                                                     */
/* ------------------------------------------------------------------ */

function MessageThread({
  conversationId,
  currentUserId,
  otherPartyName,
  otherPartyAvatar,
  otherPartyRole,
  onBack,
}: {
  conversationId: string;
  currentUserId: string;
  otherPartyName: string;
  otherPartyAvatar: string | null;
  otherPartyRole: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark as read when opening
  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const handleSend = useCallback(() => {
    const body = input.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate({ conversationId, body });
    setInput('');
  }, [input, conversationId, sendMessage]);

  const messages = data?.messages ?? [];
  // API returns newest first, reverse for display
  const sortedMessages = [...messages].reverse();

  const roleLabel = otherPartyRole === 'THERAPIST' ? 'Therapist' : otherPartyRole === 'EDUCATOR' ? 'Educator' : 'Parent';

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Avatar
          name={otherPartyName}
          src={otherPartyAvatar || undefined}
          size="sm"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {otherPartyName}
          </p>
          <p className="text-[11px] text-gray-500">{roleLabel}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-gray-500">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          <>
            {sortedMessages.map((msg, idx) => {
              const isOwn = msg.senderId === currentUserId;
              const showAvatar =
                !isOwn &&
                (idx === 0 || sortedMessages[idx - 1]?.senderId !== msg.senderId);
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  otherPartyName={otherPartyName}
                  otherPartyAvatar={otherPartyAvatar}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MessageBubble                                                     */
/* ------------------------------------------------------------------ */

function MessageBubble({
  message,
  isOwn,
  showAvatar,
  otherPartyName,
  otherPartyAvatar,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  otherPartyName: string;
  otherPartyAvatar: string | null;
}) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
      {/* Avatar placeholder for alignment */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && (
            <Avatar
              name={otherPartyName}
              src={otherPartyAvatar || undefined}
              size="sm"
            />
          )}
        </div>
      )}
      <div
        className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
          isOwn
            ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-teal-100' : 'text-gray-400'}`}>
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function MessagesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: conversations, isLoading: convsLoading } = useConversations();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const selectedConv = conversations?.find((c) => c.id === selectedConvId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>

        <Card className="overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="flex h-full">
            {/* Left: Conversation List */}
            <div
              className={`w-full lg:w-80 border-r border-gray-100 flex flex-col ${
                selectedConvId ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Search / Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">Conversations</p>
              </div>

              {/* Conversation Items */}
              <div className="flex-1 overflow-y-auto">
                {convsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ConversationList
                    conversations={conversations ?? []}
                    selectedId={selectedConvId}
                    onSelect={setSelectedConvId}
                  />
                )}
              </div>
            </div>

            {/* Right: Message Thread */}
            <div
              className={`flex-1 flex flex-col ${
                !selectedConvId ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {selectedConv ? (
                <MessageThread
                  conversationId={selectedConv.id}
                  currentUserId={user.id}
                  otherPartyName={selectedConv.otherParty.name || 'Unknown'}
                  otherPartyAvatar={selectedConv.otherParty.avatarUrl}
                  otherPartyRole={selectedConv.otherParty.role}
                  onBack={() => setSelectedConvId(null)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    Select a conversation
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
