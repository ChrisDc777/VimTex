"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, ReplyIcon } from "@/components/chat/icons";
import type { RoomChatMessage } from "@/lib/room-chat";

type ChatMessageActionsProps = {
  message: RoomChatMessage;
  disabled?: boolean;
  onReply?: (msg: RoomChatMessage) => void;
};

/**
 * Hover/focus action row under a chat bubble.
 * Icon-only; labels live in title / aria-label.
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
        className="vt-chat-msg__action vt-chat-msg__action--icon"
        disabled={disabled}
        onClick={() => void copy()}
        aria-label={copied ? "Copied" : "Copy message"}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      {onReply ? (
        <button
          type="button"
          className="vt-chat-msg__action vt-chat-msg__action--icon"
          disabled={disabled}
          onClick={() => onReply(message)}
          aria-label={
            message.role === "ai" ? "Reply to Vimothy" : "Reply to message"
          }
          title="Reply"
        >
          <ReplyIcon />
        </button>
      ) : null}
    </div>
  );
}
