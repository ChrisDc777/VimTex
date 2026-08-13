/**
 * Convert between VimTex math delimiters `\( \)` / `\[ \]` and
 * Markdown/Obsidian/GitHub `$` / `$$`. Does not rewrite bare math.
 */

/** `$x$` / `$$x$$` → `\(x\)` / `\[x\]`. Escaped `\$` is left alone. */
export function markdownDollarsToVimtex(text: string): string {
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

/** `\(x\)` / `\[x\]` → `$x$` / `$$x$$`. */
export function vimtexToMarkdownDollars(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("\\[", i)) {
      const close = text.indexOf("\\]", i + 2);
      if (close === -1) {
        out += text[i]!;
        i += 1;
        continue;
      }
      out += `$$${text.slice(i + 2, close)}$$`;
      i = close + 2;
      continue;
    }
    if (text.startsWith("\\(", i)) {
      const close = text.indexOf("\\)", i + 2);
      if (close === -1) {
        out += text[i]!;
        i += 1;
        continue;
      }
      out += `$${text.slice(i + 2, close)}$`;
      i = close + 2;
      continue;
    }
    out += text[i]!;
    i += 1;
  }
  return out;
}

export function hasMarkdownDollarMath(text: string): boolean {
  return markdownDollarsToVimtex(text) !== text;
}
