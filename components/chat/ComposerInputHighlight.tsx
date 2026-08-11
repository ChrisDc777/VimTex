"use client";

import type { ReactNode } from "react";
import { SLASH_COMMANDS } from "@/lib/slash-commands";

const KNOWN_IDS = new Set(SLASH_COMMANDS.map((c) => c.id));

/**
 * Mirror layer for the composer textarea: color known `/command` tokens
 * while keeping the rest as plain ink (Cursor-style inline slash text).
 */
export function highlightComposerInput(text: string): ReactNode[] {
  if (!text) return ["\u00a0"];

  const parts: ReactNode[] = [];
  const re = /(^|[\s])(\/[a-z][a-z0-9-]*)\b/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    const lead = match[1] ?? "";
    const token = match[2] ?? "";
    const id = token.slice(1).toLowerCase();
    const start = match.index;

    if (start > last) {
      parts.push(text.slice(last, start));
    }
    if (lead) parts.push(lead);

    if (KNOWN_IDS.has(id as (typeof SLASH_COMMANDS)[number]["id"])) {
      parts.push(
        <span key={key++} className="vt-chat-composer__slash">
          {token}
        </span>,
      );
    } else {
      parts.push(token);
    }
    last = start + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  // Trailing newline needs a visible line in the mirror.
  if (text.endsWith("\n")) parts.push("\u00a0");
  return parts;
}
