import type { ReactNode } from "react";
import { normalizeChatMathDelimiters } from "@/lib/chat-math";
import { parseNote, renderMathToHtml } from "@/lib/render-note";

/**
 * Inline emphasis for AI replies: **bold** / __bold__.
 * Runs after inline code so backticks win; math is already extracted.
 */
function formatEmphasis(text: string, keyBase: number): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|__(.+?)__/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = keyBase;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(...formatItalic(text.slice(last, match.index), key));
      key += 40;
    }
    parts.push(
      <strong key={key++} className="vt-chat-strong">
        {match[1] ?? match[2]}
      </strong>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(...formatItalic(text.slice(last), key));
  }
  return parts.length > 0 ? parts : formatItalic(text, keyBase);
}

/** Single-asterisk italic; skip bare underscores (TeX / snake_case). */
function formatItalic(text: string, keyBase: number): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*([^*\n]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = keyBase;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <em key={key++} className="vt-chat-em">
        {match[1]}
      </em>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

function highlightMentions(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /@(?:ai|vimtex|vimothy)\b/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(...formatInlineCode(text.slice(last, match.index), key));
      key += 100;
    }
    parts.push(
      <span key={key++} className="font-semibold text-primary">
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(...formatInlineCode(text.slice(last), key));
  }
  return parts.length > 0 ? parts : formatInlineCode(text, 0);
}

function formatInlineCode(text: string, keyBase: number): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = keyBase;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(...formatEmphasis(text.slice(last, match.index), key));
      key += 50;
    }
    parts.push(
      <code key={key++} className="vt-chat-inline-code">
        {match[1]}
      </code>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(...formatEmphasis(text.slice(last), key));
  }
  return parts.length > 0 ? parts : formatEmphasis(text, keyBase);
}

function formatProseWithMath(text: string, keyBase: number): ReactNode[] {
  const normalized = normalizeChatMathDelimiters(text);
  const segments = parseNote(normalized);
  const parts: ReactNode[] = [];
  let key = keyBase;

  for (const seg of segments) {
    if (seg.type === "text") {
      if (!seg.content) continue;
      parts.push(
        <span key={key++}>{highlightMentions(seg.content)}</span>,
      );
      continue;
    }
    const { html, error } = renderMathToHtml(seg.content, seg.display);
    parts.push(
      <span
        key={key++}
        className={[
          "vt-chat-math",
          seg.display ? "vt-chat-math--display" : "",
          error ? "vt-chat-math--error" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        dangerouslySetInnerHTML={{ __html: html }}
      />,
    );
  }

  return parts.length > 0 ? parts : highlightMentions(text);
}

const FENCE_RE = /```(\w*)\n?([\s\S]*?)```/g;

export function formatChatMessageBody(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = FENCE_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <span key={key++}>
          {formatProseWithMath(text.slice(last, match.index), key * 1000)}
        </span>,
      );
    }
    parts.push(
      <pre key={key++} className="vt-chat-code">
        <code>{match[2]?.replace(/\n$/, "") ?? ""}</code>
      </pre>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(
      <span key={key++}>
        {formatProseWithMath(text.slice(last), key * 1000)}
      </span>,
    );
  }

  return parts.length > 0 ? parts : formatProseWithMath(text, 0);
}
