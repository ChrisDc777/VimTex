/**
 * Studio slash-command registry (#63).
 * Chat-composer first; editor insert-mode `/` deferred (Vim conflict).
 */

export type SlashCommandId =
  | "explain"
  | "rewrite"
  | "fix"
  | "proofread"
  | "review"
  | "summarize"
  | "math"
  | "format"
  | "expand"
  | "letter"
  | "paper"
  | "cv"
  | "notes";

export type SlashCommand = {
  id: SlashCommandId;
  /** Shown as /id */
  title: string;
  hint: string;
  /** Instruction after @vimothy (no mention prefix). */
  instruction: string;
  /** When true, only offered if templatesGen is enabled (#52). */
  template?: boolean;
  /** When true, only offered if grammarReview is enabled (#62). */
  grammarReview?: boolean;
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    id: "explain",
    title: "Explain",
    hint: "Explain selection or caret context",
    instruction:
      "Explain the selected TeX (or the region around the caret) clearly and briefly. Do not change the note unless asked.",
  },
  {
    id: "rewrite",
    title: "Rewrite",
    hint: "Rewrite the selection",
    instruction:
      "Rewrite the selected text for clarity while preserving meaning. Propose a full-document edit with the rewritten selection.",
  },
  {
    id: "fix",
    title: "Fix",
    hint: "Fix TeX / diagnostics in selection",
    instruction:
      "Fix TeX / KaTeX issues in the selection (or nearby errors). Propose a full-document edit with the corrected note.",
  },
  {
    id: "proofread",
    title: "Proofread",
    hint: "Grammar and style pass",
    instruction:
      "Proofread the selection for grammar and style. Propose a full-document edit only when wording should change.",
  },
  {
    id: "review",
    title: "Review",
    hint: "Whole-note grammar / style",
    grammarReview: true,
    // Keep in sync with GRAMMAR_REVIEW_INSTRUCTION (lib/grammar-review.ts).
    instruction: [
      "Proofread the entire note for grammar, spelling, punctuation, and style.",
      "Skip math mode, verbatim/listings, and comments when possible — do not rewrite equations or code-like TeX.",
      "Preserve meaning, structure, and KaTeX-friendly markup.",
      "Propose edits via a ranged @@@PATCH (preferred) or a full-document edit only if a patch is impractical.",
      "If the prose is already fine, say so briefly and do not emit edit markers.",
    ].join("\n"),
  },
  {
    id: "summarize",
    title: "Summarize",
    hint: "Summarize selection or section",
    instruction:
      "Summarize the selected text (or the current section around the caret) in a few sentences. Do not change the note.",
  },
  {
    id: "math",
    title: "To math",
    hint: "Plain English → LaTeX math",
    instruction:
      "Convert the selected plain-English description into KaTeX-friendly LaTeX math. Propose a full-document edit replacing the selection.",
  },
  {
    id: "format",
    title: "Format",
    hint: "Tidy spacing and environments",
    instruction:
      "Tidy the selected TeX (spacing, alignment, begin/end structure) without changing meaning. Propose a full-document edit.",
  },
  {
    id: "expand",
    title: "Expand",
    hint: "Expand shorthand to full TeX",
    instruction:
      "Expand abbreviations or shorthand in the selection into full LaTeX. Propose a full-document edit.",
  },
  {
    id: "letter",
    title: "Letter",
    hint: "Scaffold a letter",
    template: true,
    instruction:
      "Replace the note with a short, compilable KaTeX-friendly letter skeleton (greeting, body, closing). Prefer plain TeX macros over a full documentclass unless helpful. Propose a full-document edit.",
  },
  {
    id: "paper",
    title: "Paper",
    hint: "Scaffold a paper",
    template: true,
    instruction:
      "Replace the note with a short article/paper skeleton: title, abstract, sections, and a sample equation. KaTeX-friendly; no heavy preamble. Propose a full-document edit.",
  },
  {
    id: "cv",
    title: "CV",
    hint: "Scaffold a CV",
    template: true,
    instruction:
      "Replace the note with a compact CV/resume skeleton (name, contact, education, experience). KaTeX-friendly. Propose a full-document edit.",
  },
  {
    id: "notes",
    title: "Notes",
    hint: "Scaffold lecture notes",
    template: true,
    instruction:
      "Replace the note with a lecture-notes skeleton: title, outline, and a few section headings with placeholder math. KaTeX-friendly. Propose a full-document edit.",
  },
] as const;

/** Filter by id / title prefix (case-insensitive). */
export function filterSlashCommands(
  query: string,
  commands: readonly SlashCommand[] = SLASH_COMMANDS,
  opts?: { includeTemplates?: boolean; includeGrammarReview?: boolean },
): SlashCommand[] {
  const includeTemplates = opts?.includeTemplates ?? true;
  const includeGrammarReview = opts?.includeGrammarReview ?? true;
  let pool = includeTemplates
    ? [...commands]
    : commands.filter((c) => !c.template);
  if (!includeGrammarReview) {
    pool = pool.filter((c) => !c.grammarReview);
  }
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter(
    (c) =>
      c.id.startsWith(q) ||
      c.title.toLowerCase().startsWith(q) ||
      c.title.toLowerCase().includes(q),
  );
}
