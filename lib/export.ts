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

/** Download the buffer as a `.tex` file. */
export function exportAsTex(note: string, basename = "vimtex-note"): void {
  triggerDownload(note, `${basename}.tex`, "application/x-tex;charset=utf-8");
}

/** Download the buffer as a `.md` file (math delimiters preserved). */
export function exportAsMd(note: string, basename = "vimtex-note"): void {
  triggerDownload(note, `${basename}.md`, "text/markdown;charset=utf-8");
}
