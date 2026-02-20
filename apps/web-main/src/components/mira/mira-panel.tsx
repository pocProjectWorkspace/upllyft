'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@upllyft/api-client';
import { useMira } from './mira-context';
import { MiraAvatar } from './mira-avatar';
import { MiraMessageBubble, TypingIndicator } from './mira-messages';
import { useMyProfile } from '@/hooks/use-dashboard';

export function MiraPanel() {
  const { isOpen, close, messages, isLoading, sendMessage, childId, setChildId, showHistory, setShowHistory,
    startNewConversation, loadConversation, conversations, loadConversations, removeConversation, conversationsLoading,
    prefilledMessage, clearPrefilledMessage } = useMira();
  const { user, isAuthenticated } = useAuth();
  const { data: profile } = useMyProfile();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const children = profile?.children || [];

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Handle prefilled message
  useEffect(() => {
    if (isOpen && prefilledMessage && !isLoading && messages.length === 0) {
      sendMessage(prefilledMessage);
      clearPrefilledMessage();
    }
  }, [isOpen, prefilledMessage, isLoading, messages.length, sendMessage, clearPrefilledMessage]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-expand
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const handleChoiceSelect = (choice: string) => {
    if (isLoading) return;
    sendMessage(choice);
  };

  if (!isAuthenticated || !user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-[49]"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-full sm:w-[440px] z-50 flex flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="h-16 bg-gradient-to-r from-teal-500 to-teal-600 px-4 flex items-center gap-3 flex-shrink-0">
              <MiraAvatar size="md" thinking={isLoading} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-lg leading-tight">Mira</p>
                <p className="text-teal-100 text-xs">Your developmental guide</p>
              </div>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => { startNewConversation(); setMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Start new conversation
                      </button>
                      <button
                        onClick={() => { setShowHistory(true); loadConversations(); setMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Past conversations
                      </button>
                      {messages.length > 0 && (
                        <button
                          onClick={() => { startNewConversation(); setMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Clear conversation
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Close */}
              <button
                onClick={close}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Child selector */}
            {children.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500">Talking about:</span>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setChildId(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      !childId ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-200'
                    }`}
                  >
                    General
                  </button>
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setChildId(child.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        childId === child.id ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-200'
                      }`}
                    >
                      {child.firstName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat area */}
            {showHistory ? (
              <HistoryView
                conversations={conversations}
                loading={conversationsLoading}
                onSelect={loadConversation}
                onDelete={removeConversation}
                onBack={() => setShowHistory(false)}
                onNew={startNewConversation}
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
                {messages.length === 0 && !isLoading ? (
                  <WelcomeState
                    userName={user.name || undefined}
                    children={children}
                    childId={childId}
                    setChildId={setChildId}
                    onStarterClick={handleChoiceSelect}
                  />
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isLatest = idx === messages.length - 1;
                      const showAvatar =
                        msg.role === 'assistant' &&
                        (idx === 0 || messages[idx - 1]?.role !== 'assistant');
                      return (
                        <MiraMessageBubble
                          key={msg.id}
                          message={msg}
                          isLatest={isLatest}
                          showAvatar={showAvatar}
                          onChoiceSelect={handleChoiceSelect}
                        />
                      );
                    })}
                    {isLoading && <TypingIndicator />}
                  </>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input area */}
            {!showHistory && (
              <div className="border-t border-gray-200 px-4 py-3 bg-white flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe what you're noticing..."
                    rows={1}
                    className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm placeholder-gray-400 resize-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition-colors"
                    style={{ maxHeight: 120 }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Welcome state ────────────────────────────────────────────────────────

function WelcomeState({
  userName,
  children: childList,
  childId,
  setChildId,
  onStarterClick,
}: {
  userName?: string;
  children: any[];
  childId: string | null;
  setChildId: (id: string | null) => void;
  onStarterClick: (text: string) => void;
}) {
  const starters = [
    "My child isn't speaking at the expected age",
    "I'm worried about my child's behavior",
    "Help me understand a recent diagnosis",
    "What developmental milestones should I expect?",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <MiraAvatar size="lg" />
      <h2 className="text-xl font-semibold text-gray-900 mt-4">Hi{userName ? `, ${userName}` : ''}! I&apos;m Mira</h2>
      <p className="text-gray-500 text-sm mt-2 max-w-xs">
        I&apos;m here to help you understand your child&apos;s development. Tell me what&apos;s on your mind, or try one of these:
      </p>

      <div className="flex flex-col gap-2 mt-6 w-full max-w-xs">
        {starters.map((s) => (
          <button
            key={s}
            onClick={() => onStarterClick(s)}
            className="text-left bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 hover:border-teal-300 hover:bg-teal-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── History view ─────────────────────────────────────────────────────────

function HistoryView({
  conversations,
  loading,
  onSelect,
  onDelete,
  onBack,
  onNew,
}: {
  conversations: any[];
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onNew: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-200 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-semibold text-gray-900 flex-1">Past Conversations</h3>
        <button
          onClick={onNew}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          + New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No past conversations</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="px-4 py-3 hover:bg-white transition-colors cursor-pointer flex items-center gap-3"
              onClick={() => onSelect(conv.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conv.title || 'Untitled conversation'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {conv.lastMessage?.substring(0, 60) || 'No messages'}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
