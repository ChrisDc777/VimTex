/**
 * Chat-only math / markup normalization for LLM replies.
 * Does not change the stored Yjs message — display pipeline only.
 */

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
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      out += "\\$";
      i += 2;
      continue;
    }
    if (text.startsWith("$$", i)) {
      const close = text.indexOf("$$", i + 2);
      if (close === -1) {
        out += text[i]!;
        i += 1;
        continue;
      }
      out += `\\[${text.slice(i + 2, close)}\\]`;
      i = close + 2;
      continue;
    }
    if (text[i] === "$") {
      const close = text.indexOf("$", i + 1);
      if (close === -1) {
        out += text[i]!;
        i += 1;
        continue;
      }
      out += `\\(${text.slice(i + 1, close)}\\)`;
      i = close + 1;
      continue;
    }
    out += text[i]!;
    i += 1;
  }
  return out;
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
