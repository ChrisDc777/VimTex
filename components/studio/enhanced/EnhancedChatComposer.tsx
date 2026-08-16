"use client";

import {
  type KeyboardEvent,
  type RefObject,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ListTodo, MessageCircle, Plus, Square } from "lucide-react";
import { mentionsAi, AI_MENTION_TAG } from "@/lib/chat-mentions";
import type { AiModelId } from "@/lib/ai-providers";
import type { SelectionContextPreview } from "@/lib/ai-chat-context";
import {
  textHasSlashCommand,
  type SlashCommand,
} from "@/lib/slash-commands";
import { ChatContextChip } from "@/components/chat/ChatContextChip";
import { ChatModelPicker } from "@/components/chat/ChatModelPicker";
import { highlightComposerInput } from "@/components/chat/ComposerInputHighlight";
import { MentionMenu } from "@/components/chat/MentionMenu";
import { SlashMenu } from "@/components/chat/SlashMenu";
import { Button } from "@/components/beui/motion/button";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/beui/motion/popover-morph";
import { SPRING_SWAP } from "@/components/beui/lib/ease";
import { cn } from "@/components/beui/lib/utils";
import type { AiChatMode } from "@/lib/ai-room-prefs";
import type { RoomChatMessage } from "@/lib/room-chat";

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
  slashCommandsEnabled?: boolean;
  readOnly?: boolean;
  selectionPreview?: SelectionContextPreview | null;
  onHideSelectionChip?: () => void;
  modelPickerVariant?: "studio" | "forge";
  queuedLabel?: string | null;
  onClearQueuedSend?: () => void;
  replyTarget?: RoomChatMessage | null;
  onClearReply?: () => void;
  chatMode?: AiChatMode;
  onChatModeChange?: (mode: AiChatMode) => void;
};

const MODE_META: Record<
  Exclude<AiChatMode, "edit">,
  { label: string; icon: typeof MessageCircle }
> = {
  ask: { label: "Ask", icon: MessageCircle },
  plan: { label: "Plan", icon: ListTodo },
};

export function EnhancedChatComposer({
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
  readOnly = false,
  selectionPreview = null,
  onHideSelectionChip,
  modelPickerVariant = "forge",
  queuedLabel = null,
  onClearQueuedSend,
  replyTarget = null,
  onClearReply,
  chatMode = "edit",
  onChatModeChange,
}: ChatComposerProps) {
  const reduce = useReducedMotion() ?? false;
  const [shellFocused, setShellFocused] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  if (readOnly) {
    return (
      <div className="vt-chat-composer-wrap">
        <p className="vt-chat-composer__hint px-1 py-2">
          View-only link — you can follow the room chat but not post.
        </p>
      </div>
    );
  }

  const syncHighlightScroll = (el: HTMLTextAreaElement) => {
    const mirror = highlightRef.current;
    if (!mirror) return;
    mirror.scrollTop = el.scrollTop;
    mirror.scrollLeft = el.scrollLeft;
  };

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

    if (slashOpen && onSlashSelect) {
      if (filteredSlashCommands.length > 0) {
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
        if (e.key === "Enter") {
          e.preventDefault();
          const cmd = filteredSlashCommands[slashIndex];
          if (cmd) onSlashSelect(cmd);
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          onSlashClose?.();
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onSlashClose?.();
        return;
      }
      if (e.key === " " && filteredSlashCommands.length > 0) {
        onSlashClose?.();
        return;
      }
    }

    if (e.key === "Escape" && replyTarget && onClearReply) {
      e.preventDefault();
      onClearReply();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const hasSlash = textHasSlashCommand(input);
  const canSend = input.trim().length > 0;
  const modeChip =
    chatMode !== "edit" && onChatModeChange ? MODE_META[chatMode] : null;
  const ModeIcon = modeChip?.icon;

  return (
    <div className="vt-chat-composer-wrap">
      {selectionPreview && (mentionsAi(input) || hasSlash) ? (
        <ChatContextChip
          preview={selectionPreview}
          onClear={onHideSelectionChip}
        />
      ) : null}

      {replyTarget && onClearReply ? (
        <div className="vt-chat-reply-bar">
          <div className="vt-chat-reply-bar__quote">
            <span className="vt-chat-reply-bar__author">
              {replyTarget.role === "ai" ? "Vimothy" : replyTarget.authorName}
            </span>
            <span className="vt-chat-reply-bar__preview">
              {replyTarget.text.replace(/\s+/g, " ").slice(0, 72)}
            </span>
          </div>
          {replyTarget.role === "ai" ? (
            <span className="vt-chat-reply-bar__hint">continues AI</span>
          ) : null}
          <button
            type="button"
            className="vt-chat-reply-bar__clear"
            onClick={onClearReply}
            aria-label="Cancel reply"
          >
            ×
          </button>
        </div>
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onSend();
        }}
        className={cn(
          "relative w-full rounded-2xl border border-border/80 bg-background p-2 transition-colors focus-within:border-foreground/25",
          (shellFocused || busy) && "border-foreground/25",
        )}
        data-busy={busy ? "true" : undefined}
        data-variant={modelPickerVariant}
      >
        {modeChip && ModeIcon ? (
          <div className="mb-2 px-1">
            <span className="beui-prompt-chip">
              <span className="beui-prompt-chip__icon" aria-hidden>
                <ModeIcon />
              </span>
              <span>{modeChip.label}</span>
              <button
                type="button"
                className="beui-prompt-chip__dismiss"
                aria-label={`Remove ${modeChip.label} mode`}
                onClick={() => onChatModeChange?.("edit")}
              >
                ×
              </button>
            </span>
          </div>
        ) : null}

        <div className="vt-chat-composer__input-area px-1">
          <div className="vt-chat-composer__input-stack">
            <div
              ref={highlightRef}
              className="vt-chat-composer__highlight"
              aria-hidden
            >
              {input ? highlightComposerInput(input) : "\u00a0"}
            </div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                const value = e.target.value;
                onInputChange(value, e.target.selectionStart ?? value.length);
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                syncHighlightScroll(el);
              }}
              onScroll={(e) => syncHighlightScroll(e.currentTarget)}
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
              rows={2}
              placeholder={
                replyTarget?.role === "ai"
                  ? "Continue with Vimothy…"
                  : replyTarget
                    ? "Write a reply…"
                    : slashCommandsEnabled
                      ? "Message…  (/ for commands)"
                      : "Message…"
              }
              enterKeyHint="send"
              className="vt-chat-composer__field bg-transparent"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="mt-1 flex min-h-8 items-center gap-1 px-1">
          {onChatModeChange ? (
            <MorphPopover open={actionsOpen} onOpenChange={setActionsOpen}>
              <MorphPopoverTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  aria-label="Add chat mode"
                  className="size-8 rounded-full"
                >
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: actionsOpen ? 45 : 0 }}
                    transition={reduce ? { duration: 0 } : SPRING_SWAP}
                  >
                    <Plus className="size-4" />
                  </motion.span>
                </Button>
              </MorphPopoverTrigger>
              <MorphPopoverContent
                side="top"
                align="start"
                sideOffset={8}
                radius={12}
                className="w-56 p-1.5"
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onChatModeChange("ask");
                    setActionsOpen(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-muted-foreground">
                    <MessageCircle className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">Ask</span>
                    <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                      Answers only — no note changes
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onChatModeChange("plan");
                    setActionsOpen(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-muted-foreground">
                    <ListTodo className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">Plan</span>
                    <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                      Outline changes before editing
                    </span>
                  </span>
                </button>
              </MorphPopoverContent>
            </MorphPopover>
          ) : null}

          <ChatModelPicker
            model={model}
            onChange={onModelChange}
            disabled={busy}
            variant={modelPickerVariant}
          />

          <Button
            type={busy ? "button" : "submit"}
            size="icon"
            disabled={busy ? !onCancel : !canSend}
            aria-label={busy ? "Stop AI" : "Send message"}
            onClick={busy ? onCancel : undefined}
            className="ml-auto size-8 rounded-full"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={busy ? "stop" : "send"}
                initial={
                  reduce ? { opacity: 1 } : { opacity: 0, y: 3, scale: 0.8 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3, scale: 0.8 }}
                transition={reduce ? { duration: 0 } : SPRING_SWAP}
                className="grid place-items-center"
              >
                {busy ? (
                  <Square className="size-3 fill-current" />
                ) : (
                  <span className="text-sm leading-none">↑</span>
                )}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </form>

      {queuedLabel && onClearQueuedSend ? (
        <div className="vt-chat-composer__queued">
          <span className="vt-chat-composer__queued-label">
            Queued: <span className="font-mono">{queuedLabel}</span>
          </span>
          <button
            type="button"
            className="vt-chat-composer__queued-clear"
            onClick={onClearQueuedSend}
            aria-label="Cancel queued message"
          >
            ×
          </button>
        </div>
      ) : busy ? (
        <p className="vt-chat-composer__hint">
          Vimothy is responding… type to queue a follow-up
        </p>
      ) : slashCommandsEnabled && !input.trim() && !replyTarget ? (
        <p className="vt-chat-composer__hint">
          {chatMode === "ask" ? (
            <>Ask mode — answers only · switch to Edit to change the note</>
          ) : chatMode === "plan" ? (
            <>Plan mode — outline first · use + to switch modes</>
          ) : (
            <>
              Type <span className="font-mono">/</span> for commands ·{" "}
              <span className="font-mono">@{AI_MENTION_TAG}</span> to ask Vimothy
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
