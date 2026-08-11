"use client";

import { useState } from "react";
import { CopyIcon, ReplyIcon } from "@/components/chat/icons";
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
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be denied */
    }
  };

  return (
    <div className="vt-chat-msg__actions">
      <button
        type="button"
        className="vt-chat-msg__action"
        disabled={disabled}
        onClick={() => void copy()}
        aria-label="Copy message"
        title="Copy"
      >
        <CopyIcon />
        {copied ? "Copied" : "Copy"}
      </button>
      {onReply ? (
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
      ) : null}
    </div>
  );
}
