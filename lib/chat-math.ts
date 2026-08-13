/**
 * Chat-only math / markup normalization for LLM replies.
 * Delimiter conversion is shared with import via `math-delimiters.ts`.
 */

import { markdownDollarsToVimtex } from "./math-delimiters.ts";

/** True when a snippet is almost certainly TeX, not prose code. */
export function looksLikeTexSnippet(raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length > 800) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (/\\[a-zA-Z([{]/.test(t)) return true; // \frac, \(, \[
  if (/\$[^$]+\$/.test(t) || /\$\$/.test(t)) return true;
  if (/[\^_]/.test(t) && /[a-zA-Z0-9]/.test(t) && t.length < 120) return true;
  return false;
}

/**
 * Models love wrapping math in `` `...` ``. Unwrap those so KaTeX can render
 * instead of showing monospace + leftover backticks.
 */
export function unwrapTexBackticks(text: string): string {
  return text.replace(/`([^`\n]+)`/g, (full, inner: string) => {
    if (!looksLikeTexSnippet(inner)) return full;
    const t = inner.trim();
    if (
      t.startsWith("\\(") ||
      t.startsWith("\\[") ||
      t.startsWith("$") ||
      t.startsWith("$$")
    ) {
      return t;
    }
    // Bare TeX → explicit inline delimiters for reliable parsing.
    return `\\(${t}\\)`;
  });
}

/**
 * LLMs often emit `$` / `$$`; VimTex notes use `\(`/`\[`.
 * Convert for chat display only.
 */
export function normalizeChatMathDelimiters(text: string): string {
  return markdownDollarsToVimtex(text);
}

/**
 * Models also wrap math in **bold** / *italic*. If we leave the markers,
 * parseNote extracts the TeX and the user sees orphaned ** around KaTeX.
 */
export function unwrapTexEmphasis(text: string): string {
  let out = text.replace(/\*\*([^*]+)\*\*/g, (full, inner: string) => {
    if (!looksLikeTexSnippet(inner) && !/\\[(\[]/.test(inner) && !/\$/.test(inner)) {
      return full;
    }
    return promoteTexInner(inner);
  });
  out = out.replace(/__([^_]+)__/g, (full, inner: string) => {
    if (!looksLikeTexSnippet(inner) && !/\\[(\[]/.test(inner) && !/\$/.test(inner)) {
      return full;
    }
    return promoteTexInner(inner);
  });
  // Single *italic* only when the whole span looks like TeX (avoid *lists*).
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, (full, lead: string, inner: string) => {
    if (!looksLikeTexSnippet(inner) && !/\\[(\[]/.test(inner)) return full;
    return `${lead}${promoteTexInner(inner)}`;
  });
  return out;
}

function promoteTexInner(inner: string): string {
  const t = inner.trim();
  if (
    t.startsWith("\\(") ||
    t.startsWith("\\[") ||
    t.startsWith("$") ||
    t.startsWith("$$")
  ) {
    return t;
  }
  return `\\(${t}\\)`;
}

/** Full display-side prep before parseNote. */
export function prepareChatMathText(text: string): string {
  return normalizeChatMathDelimiters(
    unwrapTexBackticks(unwrapTexEmphasis(text)),
  );
}

export function isMathFenceLang(lang: string): boolean {
  return /^(latex|tex|math|katex)?$/i.test(lang.trim());
}
