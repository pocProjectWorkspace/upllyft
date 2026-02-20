'use client';

import { MiraAvatar } from './mira-avatar';
import { MiraCardRenderer, MiraChoiceChips, MiraActionButtons } from './mira-cards';
import type { MiraMessage } from '@/lib/api/mira';

export function MiraMessageBubble({
  message,
  isLatest,
  showAvatar,
  onChoiceSelect,
}: {
  message: MiraMessage;
  isLatest: boolean;
  showAvatar: boolean;
  onChoiceSelect: (choice: string) => void;
}) {
  if (message.role === 'user') {
    return <UserBubble message={message} />;
  }

  return (
    <AssistantBubble
      message={message}
      isLatest={isLatest}
      showAvatar={showAvatar}
      onChoiceSelect={onChoiceSelect}
    />
  );
}

function UserBubble({ message }: { message: MiraMessage }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[80%]">
        <div className="bg-teal-600 text-white rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-gray-400 text-right mt-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  isLatest,
  showAvatar,
  onChoiceSelect,
}: {
  message: MiraMessage;
  isLatest: boolean;
  showAvatar: boolean;
  onChoiceSelect: (choice: string) => void;
}) {
  const isStreaming = isLatest && !message.cards && !message.choices && !message.actions && message.content.length > 0;

  const cards = message.cards as any[] | null;
  const choices = message.choices as string[] | null;
  const actions = message.actions as any[] | null;

  return (
    <div className="flex gap-2 mb-4">
      <div className="w-6 flex-shrink-0 pt-1">
        {showAvatar && <MiraAvatar size="sm" />}
      </div>
      <div className="max-w-[85%]">
        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {message.content}
            {isStreaming && <span className="inline-block w-1.5 h-4 bg-teal-500 ml-0.5 animate-pulse" />}
          </p>

          {/* Inline cards */}
          {cards && cards.length > 0 && (
            <div>
              {cards.map((card, i) => (
                <MiraCardRenderer key={i} card={card} />
              ))}
            </div>
          )}
        </div>

        {/* Choice chips */}
        {choices && choices.length > 0 && isLatest && (
          <MiraChoiceChips choices={choices} onSelect={onChoiceSelect} />
        )}

        {/* Action buttons */}
        {actions && actions.length > 0 && (
          <MiraActionButtons actions={actions} />
        )}

        <p className="text-xs text-gray-400 mt-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-4">
      <div className="w-6 flex-shrink-0 pt-1">
        <MiraAvatar size="sm" thinking />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
