"use client";

import {
  type KeyboardEvent,
  type RefObject,
  useState,
} from "react";
import { mentionsAi, AI_MENTION_TAG } from "@/lib/chat-mentions";
import type { AiModelId } from "@/lib/ai-providers";
import type { SelectionContextPreview } from "@/lib/ai-chat-context";
import type { SlashCommand } from "@/lib/slash-commands";
import { ChatContextChip } from "@/components/chat/ChatContextChip";
import { ChatModelPicker } from "@/components/chat/ChatModelPicker";
import { MentionMenu } from "@/components/chat/MentionMenu";
import { SlashCommandChip } from "@/components/chat/SlashCommandChip";
import { SlashMenu } from "@/components/chat/SlashMenu";
import { SendIcon, StopIcon } from "@/components/chat/icons";

type ChatComposerProps = {
  input: string;
  busy: boolean;
  model: AiModelId;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  mentionOpen: boolean;
  filteredMentions: string[];
  mentionIndex: number;
  onInputChange: (value: string, caret: number) => void;
  onModelChange: (model: AiModelId) => void;
  onSend: () => void;
  onCancel?: () => void;
  onMentionSelect: (tag: string) => void;
  onMentionIndexChange: (index: number) => void;
  onMentionClose: () => void;
  slashOpen?: boolean;
  filteredSlashCommands?: SlashCommand[];
  slashIndex?: number;
  onSlashSelect?: (command: SlashCommand) => void;
  onSlashIndexChange?: (index: number) => void;
  onSlashClose?: () => void;
  /** Studio-only: show / hint in placeholder. */
  slashCommandsEnabled?: boolean;
  /** Attached slash command (chip); cleared via onClearPendingSlash. */
  pendingSlash?: SlashCommand | null;
  onClearPendingSlash?: () => void;
  /** View-only rooms: hide send UI, show explanation. */
  readOnly?: boolean;
  /** Active editor selection attached to the next @vimothy turn. */
  selectionPreview?: SelectionContextPreview | null;
  onHideSelectionChip?: () => void;
};

export function ChatComposer({
  input,
  busy,
  model,
  inputRef,
  mentionOpen,
  filteredMentions,
  mentionIndex,
  onInputChange,
  onModelChange,
  onSend,
  onCancel,
  onMentionSelect,
  onMentionIndexChange,
  onMentionClose,
  slashOpen = false,
  filteredSlashCommands = [],
  slashIndex = 0,
  onSlashSelect,
  onSlashIndexChange,
  onSlashClose,
  slashCommandsEnabled = false,
  pendingSlash = null,
  onClearPendingSlash,
  readOnly = false,
  selectionPreview = null,
  onHideSelectionChip,
}: ChatComposerProps) {
  const [shellFocused, setShellFocused] = useState(false);

  if (readOnly) {
    return (
      <div className="vt-chat-composer-wrap">
        <p className="vt-chat-composer__hint px-1 py-2">
          View-only link — you can follow the room chat but not post.
        </p>
      </div>
    );
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onMentionIndexChange((mentionIndex + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onMentionIndexChange(
          (mentionIndex - 1 + filteredMentions.length) % filteredMentions.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onMentionSelect(filteredMentions[mentionIndex] ?? AI_MENTION_TAG);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onMentionClose();
        return;
      }
    }

    if (slashOpen && filteredSlashCommands.length > 0 && onSlashSelect) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onSlashIndexChange?.(
          (slashIndex + 1) % filteredSlashCommands.length,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onSlashIndexChange?.(
          (slashIndex - 1 + filteredSlashCommands.length) %
            filteredSlashCommands.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const cmd = filteredSlashCommands[slashIndex];
        if (cmd) onSlashSelect(cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onSlashClose?.();
        return;
      }
      // Space dismisses without running a command (#63).
      if (e.key === " ") {
        onSlashClose?.();
        return;
      }
    }

    if (e.key === "Escape" && pendingSlash && onClearPendingSlash) {
      e.preventDefault();
      onClearPendingSlash();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend =
    !busy && (Boolean(pendingSlash) || input.trim().length > 0);

  return (
    <div className="vt-chat-composer-wrap">
      {pendingSlash && onClearPendingSlash ? (
        <SlashCommandChip
          command={pendingSlash}
          onClear={onClearPendingSlash}
        />
      ) : null}

      {selectionPreview && (mentionsAi(input) || pendingSlash) ? (
        <ChatContextChip
          preview={selectionPreview}
          onClear={onHideSelectionChip}
        />
      ) : null}

      {mentionOpen ? (
        <MentionMenu
          suggestions={filteredMentions}
          activeIndex={mentionIndex}
          onSelect={onMentionSelect}
        />
      ) : null}

      {slashOpen && !mentionOpen ? (
        <SlashMenu
          commands={filteredSlashCommands}
          activeIndex={slashIndex}
          onSelect={onSlashSelect ?? (() => {})}
        />
      ) : null}

      <div
        className={
          shellFocused || busy
            ? "vt-chat-composer__shell vt-chat-composer__shell--focused"
            : "vt-chat-composer__shell"
        }
        data-busy={busy ? "true" : undefined}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            const value = e.target.value;
            onInputChange(value, e.target.selectionStart ?? value.length);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
          }}
          onKeyUp={(e) => {
            const el = e.currentTarget;
            onInputChange(el.value, el.selectionStart ?? el.value.length);
          }}
          onClick={(e) => {
            const el = e.currentTarget;
            onInputChange(el.value, el.selectionStart ?? el.value.length);
          }}
          onFocus={() => setShellFocused(true)}
          onBlur={() => setShellFocused(false)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={
            pendingSlash
              ? "Add context… (optional)"
              : slashCommandsEnabled
                ? "Message…  (/ for commands)"
                : "Message…"
          }
          enterKeyHint="send"
          disabled={busy}
          className="vt-chat-composer__field"
        />
        <div className="vt-chat-composer__toolbar">
          <ChatModelPicker
            model={model}
            onChange={onModelChange}
            disabled={busy}
          />
          {busy && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="vt-chat-send vt-chat-send--active"
              aria-label="Stop AI"
              title="Stop"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={
                canSend
                  ? "vt-chat-send vt-chat-send--active"
                  : "vt-chat-send"
              }
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>

      {busy ? (
        <p className="vt-chat-composer__hint">Vimothy is responding…</p>
      ) : slashCommandsEnabled && !pendingSlash && !input.trim() ? (
        <p className="vt-chat-composer__hint">
          Type <span className="font-mono">/</span> for commands ·{" "}
          <span className="font-mono">@{AI_MENTION_TAG}</span> to ask Vimothy
        </p>
      ) : null}
    </div>
  );
}
