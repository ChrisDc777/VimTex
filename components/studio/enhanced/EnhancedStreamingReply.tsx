"use client";

import type { ReactNode } from "react";
import { StreamingResponse } from "@/components/beui/agents/streaming-response";
import { formatChatMessageBody } from "@/lib/chat-message-body";

type EnhancedStreamingReplyProps = {
  text: string;
  streaming?: boolean;
  copyText?: string;
  onRegenerate?: () => void;
  meta?: ReactNode;
  children?: ReactNode;
};

export function EnhancedStreamingReply({
  text,
  streaming = false,
  copyText,
  onRegenerate,
  meta,
  children,
}: EnhancedStreamingReplyProps) {
  const body = children ?? formatChatMessageBody(text);
  const resolvedCopy = copyText ?? text;

  return (
    <div className="min-w-0">
      <StreamingResponse
        status={streaming ? "streaming" : "complete"}
        copyText={resolvedCopy}
        onRetry={onRegenerate}
        showActions={!streaming}
        announce={streaming}
      >
        {body}
      </StreamingResponse>
      {meta}
    </div>
  );
}
