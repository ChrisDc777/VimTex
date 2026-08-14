import { deriveDocumentTitle } from "./document-title.ts";
import { vimtexToMarkdownDollars } from "./math-delimiters.ts";
import { parseNote, renderNoteToHtml } from "./render-note.ts";

export const PRINT_ROOT_ID = "vt-print-root";

function triggerDownload(
  content: string,
  filename: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const HAS_DOCUMENT_ENV = /\\begin\{document\}/i;

/** Escape TeX specials in prose; leave commands and `%` comments alone. */
export function escapeOverleafText(text: string): string {
  return text.split("\n").map(escapeOverleafLine).join("\n");
}

function escapeOverleafLine(line: string): string {
  const heading = /^(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
  if (heading) {
    const depth = heading[1]!.length;
    const cmd =
      depth <= 1 ? "section" : depth === 2 ? "subsection" : "subsubsection";
    return `\\${cmd}*{${escapeOverleafChars(heading[2]!)}}`;
  }
  return escapeOverleafChars(line);
}

function escapeOverleafChars(line: string): string {
  let out = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === "%" && (i === 0 || line[i - 1] !== "\\")) {
      out += line.slice(i);
      break;
    }
    if (ch === "\\") {
      out += ch;
      i += 1;
      if (i >= line.length) break;
      if (/[a-zA-Z]/.test(line[i]!)) {
        while (i < line.length && /[a-zA-Z]/.test(line[i]!)) {
          out += line[i]!;
          i += 1;
        }
        i -= 1;
      } else {
        out += line[i]!;
      }
      continue;
    }
    if (
      ch === "#" ||
      ch === "$" ||
      ch === "&" ||
      ch === "_" ||
      ch === "^" ||
      ch === "~"
    ) {
      out += `\\${ch}`;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Rebuild a compilable fragment: wrap bare math, keep `\( \)` / `\[ \]`,
 * turn `#` headings into sections, escape leftover specials in prose.
 */
export function noteToOverleafBody(note: string): string {
  const segments = parseNote(note);
  let out = "";
  let cursor = 0;
  for (const seg of segments) {
    if (seg.from > cursor) {
      out += escapeOverleafText(note.slice(cursor, seg.from));
    }
    if (seg.type === "math") {
      const inner = seg.content;
      out += seg.display ? `\\[${inner}\\]` : `\\(${inner}\\)`;
    } else {
      out += escapeOverleafText(seg.content);
    }
    cursor = seg.to;
  }
  if (cursor < note.length) {
    out += escapeOverleafText(note.slice(cursor));
  }
  return out;
}

/** Minimal article wrapper so Overleaf / pdfLaTeX can compile a fragment. */
export function wrapAsOverleafDocument(note: string): string {
  const raw = note.replace(/\s+$/, "\n");
  if (HAS_DOCUMENT_ENV.test(raw)) {
    return raw.endsWith("\n") ? raw : `${raw}\n`;
  }
  const body = noteToOverleafBody(raw).replace(/\s+$/, "");
  return [
    "\\documentclass{article}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage{amsmath,amssymb}",
    "\\begin{document}",
    body,
    "\\end{document}",
    "",
  ].join("\n");
}

/** Obsidian / GitHub / Jupyter: `$` / `$$` instead of `\\(` / `\\[`. */
export function toMarkdownMathFile(note: string): string {
  const converted = vimtexToMarkdownDollars(note);
  return converted.endsWith("\n") ? converted : `${converted}\n`;
}

/** Download a compilable `.tex` (Overleaf handoff). */
export function exportAsTex(note: string, basename = "vimtex-note"): void {
  triggerDownload(
    wrapAsOverleafDocument(note),
    `${basename}.tex`,
    "application/x-tex;charset=utf-8",
  );
}

/** Download Markdown with `$` / `$$` math for other apps. */
export function exportAsMd(note: string, basename = "vimtex-note"): void {
  triggerDownload(
    toMarkdownMathFile(note),
    `${basename}.md`,
    "text/markdown;charset=utf-8",
  );
}

/** Lossless copy of the live VimTex buffer. */
export async function copyVimtexSource(note: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(note);
    return true;
  } catch {
    return false;
  }
}

function ensurePrintRoot(): HTMLElement {
  const existing = document.getElementById(PRINT_ROOT_ID);
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = PRINT_ROOT_ID;
  el.className = "vt-print-root latex-preview";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  return el;
}

/**
 * Print the rendered note (browser “Save as PDF”).
 * Uses on-page KaTeX so fonts match the preview.
 */
export function exportAsPdf(note: string): void {
  const root = ensurePrintRoot();
  root.innerHTML = renderNoteToHtml(note);
  const prevTitle = document.title;
  const derived = deriveDocumentTitle(note);
  document.title = derived === "Untitled" ? "vimtex-note" : derived;
  const restore = () => {
    document.title = prevTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
