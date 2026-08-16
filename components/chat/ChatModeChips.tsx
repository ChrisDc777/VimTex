"use client";

import type { AiChatMode } from "@/lib/ai-room-prefs";

type ChatModeChipsProps = {
  mode: AiChatMode;
  onChange: (mode: AiChatMode) => void;
  disabled?: boolean;
};

/**
 * Cursor-style Ask / Edit composer chips (#129).
 * Plan is Enhanced-only (removable chip); Basic coerces plan → ask for display.
 */
export function ChatModeChips({
  mode,
  onChange,
  disabled = false,
}: ChatModeChipsProps) {
  const chipMode = mode === "plan" ? "ask" : mode;
  return (
    <div className="vt-chat-mode-chips" role="group" aria-label="Chat mode">
      <button
        type="button"
        className={
          chipMode === "ask"
            ? "vt-chat-mode-chips__btn vt-chat-mode-chips__btn--active"
            : "vt-chat-mode-chips__btn"
        }
        aria-pressed={chipMode === "ask"}
        disabled={disabled}
        onClick={() => onChange("ask")}
        title="Answer only — no note changes"
      >
        Ask
      </button>
      <button
        type="button"
        className={
          chipMode === "edit"
            ? "vt-chat-mode-chips__btn vt-chat-mode-chips__btn--active"
            : "vt-chat-mode-chips__btn"
        }
        aria-pressed={chipMode === "edit"}
        disabled={disabled}
        onClick={() => onChange("edit")}
        title="Propose note edits (Confirm / Auto Accept)"
      >
        Edit
      </button>
    </div>
  );
}
