import { deriveDocumentTitle } from "./document-title.ts";
import { vimtexToMarkdownDollars } from "./math-delimiters.ts";
import { renderNoteToHtml } from "./render-note.ts";

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

/** Minimal article wrapper so Overleaf / pdfLaTeX can compile a fragment. */
export function wrapAsOverleafDocument(note: string): string {
  const body = note.replace(/\s+$/, "\n");
  if (HAS_DOCUMENT_ENV.test(body)) {
    return body.endsWith("\n") ? body : `${body}\n`;
  }
  return [
    "\\documentclass{article}",
    "\\usepackage{amsmath,amssymb}",
    "\\begin{document}",
    body.trimEnd(),
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
