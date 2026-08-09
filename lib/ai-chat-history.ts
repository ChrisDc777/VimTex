/**
 * Level A multi-turn memory (#54): trim prior @vimothy turns for /api/chat.
 * Stateless — client sends history; route stays free of session stores.
 */

import type { RoomChatMessage } from "./room-chat";

/** Prior turns for the model (AI SDK roles). */
export type AiHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export const DEFAULT_HISTORY_MAX_MESSAGES = 20;
export const DEFAULT_HISTORY_MAX_CHARS = 32_000;
export const MAX_HISTORY_MESSAGE_CHARS = 4_000;

export type TrimHistoryOptions = {
  maxMessages?: number;
  maxChars?: number;
  maxMessageChars?: number;
};

/** Mirrors `stripAiMention` — kept local so node:test can load this module. */
function stripMentionForHistory(text: string): string {
  return text
    .replace(/(^|[\s])@(?:vimothy|ai|vimtex)\b/gi, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Keep the newest messages that fit message-count and char budgets.
 * Drops from the oldest end; never splits a message mid-content beyond per-message cap.
 */
export function trimAiHistory(
  messages: AiHistoryMessage[],
  opts: TrimHistoryOptions = {},
): AiHistoryMessage[] {
  const maxMessages = opts.maxMessages ?? DEFAULT_HISTORY_MAX_MESSAGES;
  const maxChars = opts.maxChars ?? DEFAULT_HISTORY_MAX_CHARS;
  const maxMessageChars =
    opts.maxMessageChars ?? MAX_HISTORY_MESSAGE_CHARS;

  const normalized = messages
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, maxMessageChars),
    }))
    .filter((m) => m.content.length > 0);

  if (normalized.length === 0) return [];

  const start = Math.max(0, normalized.length - maxMessages);
  let slice = normalized.slice(start);

  let total = slice.reduce((n, m) => n + m.content.length, 0);
  while (slice.length > 1 && total > maxChars) {
    const dropped = slice[0]!;
    slice = slice.slice(1);
    total -= dropped.content.length;
  }

  if (slice.length === 1 && total > maxChars) {
    return [
      {
        role: slice[0]!.role,
        content: slice[0]!.content.slice(0, maxChars),
      },
    ];
  }

  return slice;
}

/**
 * Build model history from shared room chat, excluding the current turn
 * and non-AI peer chatter.
 */
export function buildAiHistoryFromRoomChat(
  messages: RoomChatMessage[],
  opts: {
    /** Omit this message and anything after it (the in-flight user turn). */
    beforeMessageId?: string;
    maxMessages?: number;
    maxChars?: number;
  } = {},
): AiHistoryMessage[] {
  let list = messages;
  if (opts.beforeMessageId) {
    const idx = list.findIndex((m) => m.id === opts.beforeMessageId);
    if (idx >= 0) list = list.slice(0, idx);
  }

  const turns: AiHistoryMessage[] = [];
  for (const m of list) {
    if (m.role === "ai") {
      const content = m.text.trim();
      if (content) turns.push({ role: "assistant", content });
      continue;
    }
    if (m.role === "user" && m.mentionAi) {
      const content = stripMentionForHistory(m.text);
      if (content) turns.push({ role: "user", content });
    }
  }

  return trimAiHistory(turns, {
    maxMessages: opts.maxMessages,
    maxChars: opts.maxChars,
  });
}
