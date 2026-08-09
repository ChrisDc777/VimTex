/**
 * Editor insert-mode `/` scaffolds (Notion-like blocks).
 * Separate from chat AI slash commands (#63).
 * Dependency-free so node unit tests can load this file.
 */

/** Same marker as lib/snippets SNIPPET_CURSOR. */
const CURSOR = "\uE000";

export type EditorSlashInsert = {
  id: string;
  /** Typed after `/` (e.g. section → /section). */
  slash: string;
  label: string;
  keywords: string;
  snippet: string;
};

export const EDITOR_SLASH_INSERTS: readonly EditorSlashInsert[] = [
  {
    id: "section",
    slash: "section",
    label: "Section",
    keywords: "section heading outline",
    snippet: `\\section{${CURSOR}}\n`,
  },
  {
    id: "subsection",
    slash: "subsection",
    label: "Subsection",
    keywords: "subsection heading outline",
    snippet: `\\subsection{${CURSOR}}\n`,
  },
  {
    id: "todo",
    slash: "todo",
    label: "Todo",
    keywords: "todo task outline",
    snippet: `\\todo{${CURSOR}}`,
  },
  {
    id: "display",
    slash: "math",
    label: "Display math",
    keywords: "math display equation",
    snippet: `\\[${CURSOR}\\]`,
  },
  {
    id: "itemize",
    slash: "list",
    label: "Bullet list",
    keywords: "list itemize bullets",
    snippet: `\\begin{itemize}\n  \\item ${CURSOR}\n\\end{itemize}\n`,
  },
  {
    id: "enumerate",
    slash: "enum",
    label: "Numbered list",
    keywords: "list enumerate numbered",
    snippet: `\\begin{enumerate}\n  \\item ${CURSOR}\n\\end{enumerate}\n`,
  },
];

export function filterEditorSlashInserts(
  query: string,
  items: readonly EditorSlashInsert[] = EDITOR_SLASH_INSERTS,
): EditorSlashInsert[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter(
    (item) =>
      item.slash.startsWith(q) ||
      item.label.toLowerCase().startsWith(q) ||
      item.keywords.toLowerCase().includes(q),
  );
}
