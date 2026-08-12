"use client";

import type { AiChatMode } from "@/lib/ai-room-prefs";

type ChatModeChipsProps = {
  mode: AiChatMode;
  onChange: (mode: AiChatMode) => void;
  disabled?: boolean;
};

/**
 * Cursor-style Ask / Edit composer chips (#129).
 * Plan / agent depth deferred.
 */
export function ChatModeChips({
  mode,
  onChange,
  disabled = false,
}: ChatModeChipsProps) {
  return (
    <div className="vt-chat-mode-chips" role="group" aria-label="Chat mode">
      <button
        type="button"
        className={
          mode === "ask"
            ? "vt-chat-mode-chips__btn vt-chat-mode-chips__btn--active"
            : "vt-chat-mode-chips__btn"
        }
        aria-pressed={mode === "ask"}
        disabled={disabled}
        onClick={() => onChange("ask")}
        title="Answer only — no note changes"
      >
        Ask
      </button>
      <button
        type="button"
        className={
          mode === "edit"
            ? "vt-chat-mode-chips__btn vt-chat-mode-chips__btn--active"
            : "vt-chat-mode-chips__btn"
        }
        aria-pressed={mode === "edit"}
        disabled={disabled}
        onClick={() => onChange("edit")}
        title="Propose note edits (Confirm / Auto Accept)"
      >
        Edit
      </button>
    </div>
  );
}
