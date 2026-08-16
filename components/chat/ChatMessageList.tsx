"use client";

import type { CSSProperties } from "react";
import { groupChatMessages } from "@/lib/chat-message-blocks";
import { formatChatMessageBody } from "@/lib/chat-message-body";
import type { SelectionContextPreview } from "@/lib/ai-chat-context";
import { formatRelativeTime, type RoomChatMessage } from "@/lib/room-chat";
import { AiAgentMark } from "@/components/chat/AiAgentMark";
import { AiDiffProposal } from "@/components/chat/AiDiffProposal";
import { AiReplyMeta } from "@/components/chat/AiReplyMeta";
import { ChatContextAttachment } from "@/components/chat/ChatContextChip";
import { ChatMessageActions } from "@/components/chat/ChatMessageActions";
import { RefreshIcon } from "@/components/chat/icons";
import { DEFAULT_AI_AGENT } from "@/lib/ai-agents";

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
  onRegenerate?: (msg: RoomChatMessage) => void;
  onReply?: (msg: RoomChatMessage) => void;
  onSuggestion: (text: string) => void;
  stickBottom: boolean;
  onScrollToBottom: () => void;
  /** Current room occupancy; used to show a "waiting for peers" empty state. */
  peerCount?: number;
  /** When false, documentEdit hints say proposed (Forge suggest-only). */
  canMutateViaAi?: boolean;
  /** Override empty-state subtitle. */
  emptySubtitle?: string;
  pendingEdit?: {
    messageId: string;
    before: string;
    after: string;
  } | null;
  editOutcomes?: Record<string, "accepted" | "rejected" | "auto">;
  onAcceptEdit?: () => void;
  onRejectEdit?: () => void;
  readOnly?: boolean;
  streamingText?: string | null;
  messageContexts?: Record<string, SelectionContextPreview>;
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
  onRegenerate,
  onReply,
  onSuggestion,
  stickBottom,
  onScrollToBottom,
  peerCount,
  canMutateViaAi = true,
  emptySubtitle,
  pendingEdit = null,
  editOutcomes = {},
  onAcceptEdit,
  onRejectEdit,
  readOnly = false,
  streamingText = null,
  messageContexts = {},
}: ChatMessageListProps) {
  const blocks = groupChatMessages(messages, currentClientId, currentUserName);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-x-clip">
      <div ref={listRef} onScroll={onScroll} className="vt-chat-list">
        {messages.length === 0 ? (
          <div className="vt-chat-empty">
            <p className="vt-chat-empty__title">Message the room</p>
            <p className="vt-chat-empty__subtitle">
              {emptySubtitle ??
                (canMutateViaAi
                  ? "Mention @vimothy to edit the note"
                  : "Mention @vimothy for suggestions (Forge won’t change the note)")}
            </p>
            {peerCount != null && peerCount <= 1 ? (
              <p className="vt-chat-empty__waiting">
                You&apos;re the only one here — share the room link to invite
                teammates.
              </p>
            ) : null}
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
                {block.isAi ? (
                  <span
                    className="vt-chat-block__agent"
                    style={
                      {
                        ["--ai-agent-accent"]: DEFAULT_AI_AGENT.accent,
                      } as CSSProperties
                    }
                  >
                    <AiAgentMark agent={DEFAULT_AI_AGENT} size="md" />
                    <span className="vt-chat-block__author">
                      {DEFAULT_AI_AGENT.name}
                    </span>
                  </span>
                ) : (
                  <span
                    className="vt-chat-block__author"
                    style={{ color: block.authorColor }}
                  >
                    {block.isSelf ? "You" : block.authorName}
                  </span>
                )}
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
                        {message.replyTo ? (
                          <div className="vt-chat-msg__reply-ref">
                            <span className="vt-chat-msg__reply-author">
                              {message.replyTo.authorName}
                            </span>
                            <span className="vt-chat-msg__reply-preview">
                              {message.replyTo.preview}
                            </span>
                          </div>
                        ) : null}
                        {formatChatMessageBody(message.text)}
                      </div>
                      {messageContexts[message.id] ? (
                        <ChatContextAttachment
                          preview={messageContexts[message.id]!}
                        />
                      ) : null}

                      {!readOnly ? (
                        <ChatMessageActions
                          message={message}
                          disabled={busy}
                          onReply={onReply}
                        />
                      ) : null}

                      {block.isAi ? (
                        <AiReplyMeta
                          message={message}
                          busy={busy}
                          onRegenerate={onRegenerate}
                        />
                      ) : null}

                      {block.isAi && message.documentEdit != null ? (
                        pendingEdit?.messageId === message.id &&
                        onAcceptEdit &&
                        onRejectEdit ? (
                          <AiDiffProposal
                            before={pendingEdit.before}
                            after={pendingEdit.after}
                            onAccept={onAcceptEdit}
                            onReject={onRejectEdit}
                            disabled={busy || readOnly}
                          />
                        ) : (
                          <p className="vt-chat-msg__applied">
                            {editOutcomes[message.id] === "accepted" ||
                            editOutcomes[message.id] === "auto" ? (
                              <>
                                <span aria-hidden>✓</span>{" "}
                                {editOutcomes[message.id] === "auto"
                                  ? "Auto-applied"
                                  : "Accepted — applied to note"}
                              </>
                            ) : editOutcomes[message.id] === "rejected" ? (
                              <>Rejected — note unchanged</>
                            ) : canMutateViaAi ? (
                              <>Proposed edit</>
                            ) : (
                              <>Proposed edit (not applied — suggest-only)</>
                            )}
                          </p>
                        )
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
            <div
              className="vt-chat-block__meta"
              style={
                {
                  ["--ai-agent-accent"]: DEFAULT_AI_AGENT.accent,
                } as CSSProperties
              }
            >
              <span className="vt-chat-block__agent">
                <AiAgentMark agent={DEFAULT_AI_AGENT} size="md" />
                <span className="vt-chat-block__author">
                  {DEFAULT_AI_AGENT.name}
                </span>
              </span>
              <span className="vt-chat-block__time">streaming</span>
            </div>
            {streamingText?.trim() ? (
              <div className="vt-chat-msg__bubble whitespace-pre-wrap">
                {formatChatMessageBody(streamingText)}
              </div>
            ) : (
              <span className="vt-chat-typing__dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            )}
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
