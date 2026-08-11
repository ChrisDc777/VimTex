import type { ReactNode } from "react";
import {
  isMathFenceLang,
  prepareChatMathText,
} from "@/lib/chat-math";
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
      parts.push(...highlightSlashCommands(text.slice(last, match.index), key));
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
    parts.push(...highlightSlashCommands(text.slice(last), key));
  }
  return parts.length > 0 ? parts : highlightSlashCommands(text, 0);
}

/** Color `/command` tokens inline in bubbles — not a separate attachment row. */
function highlightSlashCommands(text: string, keyBase: number): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(^|[\s])(\/[a-z][a-z0-9-]*)\b/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = keyBase;
  while ((match = re.exec(text)) !== null) {
    const lead = match[1] ?? "";
    const token = match[2] ?? "";
    const start = match.index;
    if (start > last) {
      parts.push(...formatInlineCode(text.slice(last, start), key));
      key += 40;
    }
    if (lead) parts.push(lead);
    parts.push(
      <span key={key++} className="vt-chat-slash-inline">
        {token}
      </span>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) {
    parts.push(...formatInlineCode(text.slice(last), key));
  }
  return parts.length > 0 ? parts : formatInlineCode(text, keyBase);
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

function renderMathNode(
  content: string,
  display: boolean,
  key: number,
  error?: string,
): ReactNode {
  const { html, error: err } = renderMathToHtml(content, display);
  const hasError = Boolean(error || err);
  return (
    <span
      key={key}
      className={[
        "vt-chat-math",
        display ? "vt-chat-math--display" : "",
        hasError ? "vt-chat-math--error" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function formatProseWithMath(text: string, keyBase: number): ReactNode[] {
  const normalized = prepareChatMathText(text);
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
    parts.push(renderMathNode(seg.content, seg.display, key++));
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
    const lang = match[1] ?? "";
    const body = match[2]?.replace(/\n$/, "") ?? "";
    // ```latex / ```tex / unlabeled TeX fences → KaTeX, not a code block.
    if (isMathFenceLang(lang) && /\\[a-zA-Z([{]|\$/.test(body)) {
      parts.push(renderMathNode(body.trim(), true, key++));
    } else {
      parts.push(
        <pre key={key++} className="vt-chat-code">
          <code>{body}</code>
        </pre>,
      );
    }
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
