"use client";

import { RefreshIcon } from "@/components/chat/icons";
import { formatAiUsageLabel } from "@/lib/ai-usage";
import { providerForModel } from "@/lib/ai-providers";
import type { RoomChatMessage } from "@/lib/room-chat";

type AiReplyMetaProps = {
  message: RoomChatMessage;
  busy?: boolean;
  onRegenerate?: (msg: RoomChatMessage) => void;
};

function shortModelLabel(model: string | null | undefined): string | null {
  if (!model) return null;
  const known = providerForModel(model).models.find((m) => m.id === model);
  if (known) return known.label;
  const slug = model.includes("/") ? model.split("/").pop()! : model;
  return slug.split(":")[0] || slug;
}

/**
 * Compact model / usage / regenerate row under an AI chat reply (#60).
 */
export function AiReplyMeta({
  message,
  busy = false,
  onRegenerate,
}: AiReplyMetaProps) {
  if (message.role !== "ai") return null;
  const modelLabel = shortModelLabel(message.model);
  // Show token counts only when the provider actually reported them.
  const usageLabel = message.usage ? formatAiUsageLabel(message.usage) : "";
  const keyHint =
    message.keySource === "user"
      ? "your key"
      : message.keySource === "server"
        ? "shared key"
        : null;
  const info = [modelLabel, usageLabel, keyHint].filter(Boolean).join(" · ");
  if (!info && !onRegenerate) return null;

  return (
    <div className="vt-chat-ai-meta">
      {info ? (
        <span className="vt-chat-ai-meta__info" title={message.model ?? undefined}>
          {info}
        </span>
      ) : (
        <span />
      )}
      {onRegenerate ? (
        <button
          type="button"
          className="vt-chat-ai-meta__regen vt-chat-msg__action--icon"
          disabled={busy}
          onClick={() => onRegenerate(message)}
          aria-label="Regenerate reply"
          title="Regenerate"
        >
          <RefreshIcon />
        </button>
      ) : null}
    </div>
  );
}
