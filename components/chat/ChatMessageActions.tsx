"use client";

import { ReplyIcon } from "@/components/chat/icons";
import type { RoomChatMessage } from "@/lib/room-chat";

type ChatMessageActionsProps = {
  message: RoomChatMessage;
  disabled?: boolean;
  onReply?: (msg: RoomChatMessage) => void;
};

/**
 * Hover/focus action row under a chat bubble.
 * Reply continues the thread; AI replies auto-invoke Vimothy on send.
 */
export function ChatMessageActions({
  message,
  disabled = false,
  onReply,
}: ChatMessageActionsProps) {
  if (!onReply) return null;

  return (
    <div className="vt-chat-msg__actions">
      <button
        type="button"
        className="vt-chat-msg__action"
        disabled={disabled}
        onClick={() => onReply(message)}
        aria-label={
          message.role === "ai" ? "Reply to Vimothy" : "Reply to message"
        }
        title="Reply"
      >
        <ReplyIcon />
        Reply
      </button>
    </div>
  );
}
