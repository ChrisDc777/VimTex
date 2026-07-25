import type { ReactNode } from "react";

function highlightMentions(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /@(?:ai|vimtex)\b/gi;
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
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <code key={key++} className="vt-chat-inline-code">
        {match[1]}
      </code>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
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
        <span key={key++}>{highlightMentions(text.slice(last, match.index))}</span>,
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
      <span key={key++}>{highlightMentions(text.slice(last))}</span>,
    );
  }

  return parts.length > 0 ? parts : highlightMentions(text);
}
