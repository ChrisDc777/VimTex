"use client";

import { useState } from "react";
import { Check, Copy, Reply } from "lucide-react";
import { ActionSwapIcon } from "@/components/beui/motion/action-swap";
import type { RoomChatMessage } from "@/lib/room-chat";

type ChatMessageActionsProps = {
  message: RoomChatMessage;
  disabled?: boolean;
  onReply?: (msg: RoomChatMessage) => void;
  /** When false, hide Copy (AI bodies use StreamingResponse copy). */
  showCopy?: boolean;
};

export function EnhancedChatMessageActions({
  message,
  disabled = false,
  onReply,
  showCopy = true,
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

  if (!showCopy && !onReply) return null;

  return (
    <div className="vt-chat-msg__actions">
      {showCopy ? (
        <button
          type="button"
          className="vt-chat-msg__action vt-chat-msg__action--icon"
          disabled={disabled}
          onClick={() => void copy()}
          aria-label={copied ? "Copied" : "Copy message"}
          title={copied ? "Copied" : "Copy"}
        >
          <ActionSwapIcon value={copied ? "copied" : "copy"} className="h-3.5 w-3.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </ActionSwapIcon>
        </button>
      ) : null}
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
          <Reply className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
