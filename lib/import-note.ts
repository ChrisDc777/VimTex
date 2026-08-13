/**
 * Normalize a dropped/picked note so it matches FORMAT.md: UTF-8, LF, no BOM.
 * Full LaTeX documents import the `document` body only; fragments stay verbatim.
 */

export const NOTE_IMPORT_ACCEPT = ".tex,.md,.markdown,.txt";
export const NOTE_IMPORT_MAX_BYTES = 1_048_576;

const BEGIN_DOCUMENT = /\\begin\{document\}[ \t]*(?:\n)?/i;
const END_DOCUMENT = /\\end\{document\}/i;

export function normalizeImportedText(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Body between `\begin{document}` and `\end{document}`, or null if none. */
export function extractLatexDocumentBody(text: string): string | null {
  const begin = BEGIN_DOCUMENT.exec(text);
  if (!begin) return null;
  const start = begin.index + begin[0].length;
  const rest = text.slice(start);
  const end = END_DOCUMENT.exec(rest);
  return end ? rest.slice(0, end.index) : rest;
}

/**
 * Prepare file bytes for the Yjs buffer.
 * `$` / `$$` stay literal (FORMAT.md); no Markdown-math rewrite.
 */
export function prepareImportedNote(raw: string, filename = ""): string {
  const normalized = normalizeImportedText(raw);
  const looksTex =
    /\.tex$/i.test(filename.trim()) || BEGIN_DOCUMENT.test(normalized);
  const extracted = looksTex ? extractLatexDocumentBody(normalized) : null;
  const body = extracted ?? normalized;
  const trimmed = body.replace(/[ \t]+\n/g, "\n").replace(/[ \t]+$/g, "");
  if (!trimmed.trim()) return "";
  return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
}
