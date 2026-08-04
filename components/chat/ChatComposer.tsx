"use client";

import {
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { mentionsAi, AI_MENTION_TAG } from "@/lib/chat-mentions";
import type { AiModelId } from "@/lib/ai-providers";
import { ChatModelPicker } from "@/components/chat/ChatModelPicker";
import { MentionMenu } from "@/components/chat/MentionMenu";
import { SendIcon } from "@/components/chat/icons";

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
  onMentionSelect: (tag: string) => void;
  onMentionIndexChange: (index: number) => void;
  onMentionClose: () => void;
  /** View-only rooms: hide send UI, show explanation. */
  readOnly?: boolean;
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
  onMentionSelect,
  onMentionIndexChange,
  onMentionClose,
  readOnly = false,
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

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = !busy && input.trim().length > 0;

  return (
    <div className="vt-chat-composer-wrap">
      {mentionOpen ? (
        <MentionMenu
          suggestions={filteredMentions}
          activeIndex={mentionIndex}
          onSelect={onMentionSelect}
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
          placeholder="Message…"
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
        </div>
      </div>

      {mentionsAi(input) ? (
        <p className="vt-chat-composer__hint">
          Will call AI with this instruction
        </p>
      ) : null}
    </div>
  );
}
