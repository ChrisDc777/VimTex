"use client";

import { groupChatMessages } from "@/lib/chat-message-blocks";
import { formatChatMessageBody } from "@/lib/chat-message-body";
import { formatRelativeTime, type RoomChatMessage } from "@/lib/room-chat";
import { RefreshIcon } from "@/components/chat/icons";

const EMPTY_SUGGESTIONS = [
  "@vimothy fix the equation in section 2",
  "@vimothy tighten the introduction",
];

type ChatMessageListProps = {
  messages: RoomChatMessage[];
  currentClientId: number | null;
  currentUserName: string;
  now: number;
  busy: boolean;
  error: string | null;
  errorForId: string | null;
  listRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onRetry: (msg: RoomChatMessage) => void;
  onSuggestion: (text: string) => void;
  stickBottom: boolean;
  onScrollToBottom: () => void;
};

export function ChatMessageList({
  messages,
  currentClientId,
  currentUserName,
  now,
  busy,
  error,
  errorForId,
  listRef,
  onScroll,
  onRetry,
  onSuggestion,
  stickBottom,
  onScrollToBottom,
}: ChatMessageListProps) {
  const blocks = groupChatMessages(messages, currentClientId, currentUserName);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={listRef} onScroll={onScroll} className="vt-chat-list">
        {messages.length === 0 ? (
          <div className="vt-chat-empty">
            <p className="vt-chat-empty__title">Message the room</p>
            <p className="vt-chat-empty__subtitle">
              Mention @vimothy to edit the note
            </p>
            <div className="vt-chat-empty__suggestions">
              {EMPTY_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="vt-chat-suggestion"
                  onClick={() => onSuggestion(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {blocks.map((block) => {
          const blockClass = block.isSelf
            ? "vt-chat-block vt-chat-block--self"
            : block.isAi
              ? "vt-chat-block vt-chat-block--ai"
              : "vt-chat-block vt-chat-block--other";

          return (
            <article key={block.key} className={blockClass}>
              <div className="vt-chat-block__meta">
                <span
                  className="vt-chat-block__author"
                  style={{
                    color: block.isAi ? "var(--primary)" : block.authorColor,
                  }}
                >
                  {block.isSelf ? "You" : block.isAi ? "Vimothy" : block.authorName}
                </span>
                <span className="vt-chat-block__time">
                  {formatRelativeTime(block.startedAt, now)}
                </span>
              </div>

              <div className="vt-chat-block__messages">
                {block.messages.map((message) => {
                  const showError = error && errorForId === message.id;
                  return (
                    <div key={message.id} className="vt-chat-msg">
                      <div className="vt-chat-msg__bubble">
                        {formatChatMessageBody(message.text)}
                      </div>

                      {block.isAi && message.documentEdit != null ? (
                        <p className="vt-chat-msg__applied">
                          <span aria-hidden>✓</span> Applied to note
                        </p>
                      ) : null}

                      {showError ? (
                        <div className="vt-chat-error">
                          <p className="vt-chat-error__text">{error}</p>
                          <button
                            type="button"
                            onClick={() => onRetry(message)}
                            disabled={busy}
                            className="vt-chat-retry"
                          >
                            <RefreshIcon />
                            Retry
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}

        {busy ? (
          <div
            className="vt-chat-block vt-chat-block--ai vt-chat-typing"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="vt-chat-block__meta">
              <span className="vt-chat-block__author">AI</span>
              <span className="vt-chat-block__time">thinking</span>
            </div>
            <span className="vt-chat-typing__dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : null}
      </div>

      {!stickBottom && messages.length > 0 ? (
        <button
          type="button"
          className="vt-chat-scroll-bottom"
          onClick={onScrollToBottom}
          aria-label="Scroll to latest messages"
        >
          Latest
        </button>
      ) : null}
    </div>
  );
}
