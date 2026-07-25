const MAX_TITLE_LENGTH = 40;

/** Strip common TeX markup for display titles. */
function stripTexMarkup(text: string): string {
  return text
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})*/g, " ")
    .replace(/[{}$\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateTitle(text: string): string {
  if (text.length <= MAX_TITLE_LENGTH) return text;
  return `${text.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}

/** Derive a display title from note content. */
export function deriveDocumentTitle(note: string): string {
  const trimmed = note.trim();
  if (!trimmed) return "Untitled";

  const titleMatch = trimmed.match(/\\title\{([^}]*)\}/);
  if (titleMatch?.[1]) {
    const title = stripTexMarkup(titleMatch[1]);
    if (title) return truncateTitle(title);
  }

  const firstLine = trimmed.split(/\r?\n/).find((line) => line.trim());
  if (firstLine) {
    const line = stripTexMarkup(firstLine);
    if (line) return truncateTitle(line);
  }

  return "Untitled";
}

/** Resolve the tab label: custom title wins over derived. */
export function resolveTabTitle(
  customTitle: string | undefined,
  derivedTitle: string,
): string {
  const custom = customTitle?.trim();
  if (custom) return truncateTitle(custom);
  return derivedTitle;
}
