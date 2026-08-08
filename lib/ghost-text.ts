/**
 * Local ghost-text suggestions (#55 Level A).
 * Pure heuristics — no model call. AI type-ahead can layer on later.
 */

export type GhostSuggestion = {
  /** Text to insert at the caret. */
  text: string;
  /** Caret offset where the ghost is shown (usually current head). */
  from: number;
};

const BEGIN_RE = /\\begin\{([A-Za-z*]+)\}$/;

/**
 * Suggest a closing `\end{…}` after a completed `\begin{env}` at the caret.
 */
export function suggestEndEnvironment(
  doc: string,
  head: number,
): GhostSuggestion | null {
  if (head <= 0 || head > doc.length) return null;
  const before = doc.slice(Math.max(0, head - 80), head);
  const match = before.match(BEGIN_RE);
  if (!match) return null;
  const env = match[1]!;
  const end = `\\end{${env}}`;
  // Don't suggest if the same end already follows immediately.
  const after = doc.slice(head, head + end.length + 8);
  if (after.includes(end)) return null;
  return { text: `\n${end}`, from: head };
}

/** Suggest closing math delimiters when an opener is unmatched before the caret. */
export function suggestMathCloser(
  doc: string,
  head: number,
): GhostSuggestion | null {
  if (head <= 0) return null;
  const before = doc.slice(0, head);
  const after = doc.slice(head);

  const openDisplay = before.lastIndexOf("\\[");
  const closeDisplay = before.lastIndexOf("\\]");
  if (openDisplay > closeDisplay && !after.startsWith("\\]")) {
    return { text: "\\]", from: head };
  }

  const openInline = before.lastIndexOf("\\(");
  const closeInline = before.lastIndexOf("\\)");
  if (openInline > closeInline && !after.startsWith("\\)")) {
    return { text: "\\)", from: head };
  }

  if (/(^|[^\\])\$\$$/.test(before) && !after.startsWith("$$")) {
    // Completed opener $$ at caret with no closer yet in the prefix after last $$.
    const last = before.lastIndexOf("$$");
    const afterOpen = before.slice(last + 2);
    if (!afterOpen.includes("$$")) {
      return { text: "$$", from: head };
    }
  }

  // Single $ — crude: odd count of unescaped $ before caret.
  const dollars = before.match(/(^|[^\\])\$/g);
  if (dollars && dollars.length % 2 === 1 && !after.startsWith("$")) {
    return { text: "$", from: head };
  }
  return null;
}

/** Best local suggestion for the caret, or null. */
export function computeGhostSuggestion(
  doc: string,
  head: number,
): GhostSuggestion | null {
  return (
    suggestEndEnvironment(doc, head) ?? suggestMathCloser(doc, head) ?? null
  );
}
