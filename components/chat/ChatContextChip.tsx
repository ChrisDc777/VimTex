"use client";

import type { SelectionContextPreview } from "@/lib/ai-chat-context";

type ChatContextChipProps = {
  preview: SelectionContextPreview;
  /** Optional dismiss — hides until selection changes. */
  onClear?: () => void;
};

/**
 * Compact attached-selection chip above the composer (line range + snippet).
 */
export function ChatContextChip({ preview, onClear }: ChatContextChipProps) {
  return (
    <div
      className="vt-chat-context-chip"
      title={preview.preview}
      aria-label={`Selection ${preview.label}: ${preview.preview}`}
    >
      <span className="vt-chat-context-chip__label">{preview.label}</span>
      <span className="vt-chat-context-chip__preview">{preview.preview}</span>
      {onClear ? (
        <button
          type="button"
          className="vt-chat-context-chip__clear"
          onClick={onClear}
          aria-label="Hide selection chip"
          title="Hide"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

type ChatContextAttachmentProps = {
  preview: SelectionContextPreview;
};

/** Shown under a sent user message that carried selection / diagnostic context. */
export function ChatContextAttachment({ preview }: ChatContextAttachmentProps) {
  const tone = preview.tone === "error" ? " vt-chat-context-attach--error" : "";
  return (
    <div
      className={`vt-chat-context-attach${tone}`}
      title={preview.preview}
      aria-label={
        preview.tone === "error"
          ? `Error ${preview.label}`
          : `Used selection ${preview.label}`
      }
    >
      <span className="vt-chat-context-attach__label">{preview.label}</span>
      <span className="vt-chat-context-attach__preview">{preview.preview}</span>
    </div>
  );
}
