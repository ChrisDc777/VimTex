/**
 * LLMs often emit `$` / `$$`; VimTex notes use `\(`/`\[`.
 * Convert for chat display only — does not change the stored message.
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
