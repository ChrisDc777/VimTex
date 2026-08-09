/**
 * Studio chat document actions (#58).
 * High-level pills → runAiInstruction → Confirm/diff.
 */

export type DocAiActionId =
  | "fix-errors"
  | "add-abstract"
  | "to-latex"
  | "summarize"
  | "review";

export type DocAiAction = {
  id: DocAiActionId;
  label: string;
  /** Short chat bubble text. */
  chatText: string;
  /** Build the model instruction from the live note (document is also in system prompt). */
  buildInstruction: (note: string) => string;
  /** When true, only offered if grammarReview is enabled (#62). */
  grammarReview?: boolean;
};

export const DOC_AI_ACTIONS: readonly DocAiAction[] = [
  {
    id: "fix-errors",
    label: "Fix errors",
    chatText: "Fix all math / TeX errors",
    buildInstruction: () =>
      [
        "Fix all KaTeX / TeX errors in the current note.",
        "Scan the full buffer for broken math, mismatched delimiters, and invalid commands.",
        "Propose a full-document edit with the corrected note. Preserve unrelated content.",
      ].join("\n"),
  },
  {
    id: "add-abstract",
    label: "Add abstract",
    chatText: "Add an abstract",
    buildInstruction: () =>
      [
        "Add a short abstract to this note.",
        "Prefer an `\\begin{abstract}...\\end{abstract}` block near the top (after any title), or a clear Abstract heading if the note is plain Markdown-ish TeX.",
        "Propose a full-document edit. Do not invent fake citations.",
      ].join("\n"),
  },
  {
    id: "to-latex",
    label: "To LaTeX",
    chatText: "Convert draft to LaTeX",
    buildInstruction: () =>
      [
        "Convert this draft into clean, KaTeX-friendly LaTeX.",
        "Keep meaning; prefer \\( \\) / \\[ \\] for math. No documentclass wrapper unless the note already has one.",
        "Propose a full-document edit.",
      ].join("\n"),
  },
  {
    id: "summarize",
    label: "Summarize",
    chatText: "Summarize the note",
    buildInstruction: () =>
      [
        "Summarize the current note in a few short bullets in chat.",
        "Do not change the note.",
      ].join("\n"),
  },
  {
    id: "review",
    label: "Review",
    chatText: "Review grammar & style",
    grammarReview: true,
    // Keep in sync with GRAMMAR_REVIEW_INSTRUCTION (lib/grammar-review.ts).
    buildInstruction: () =>
      [
        "Proofread the entire note for grammar, spelling, punctuation, and style.",
        "Skip math mode, verbatim/listings, and comments when possible — do not rewrite equations or code-like TeX.",
        "Preserve meaning, structure, and KaTeX-friendly markup.",
        "Propose edits via a ranged @@@PATCH (preferred) or a full-document edit only if a patch is impractical.",
        "If the prose is already fine, say so briefly and do not emit edit markers.",
      ].join("\n"),
  },
] as const;

/** Filter doc-action pills by capability flags. */
export function filterDocAiActions(
  actions: readonly DocAiAction[] = DOC_AI_ACTIONS,
  opts?: { includeGrammarReview?: boolean },
): DocAiAction[] {
  const includeGrammarReview = opts?.includeGrammarReview ?? true;
  if (includeGrammarReview) return [...actions];
  return actions.filter((a) => !a.grammarReview);
}
