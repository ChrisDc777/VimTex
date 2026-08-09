/**
 * Studio slash-command registry (#63).
 * Keep the chat `/` menu short — only high-traffic actions.
 */

export type SlashCommandId =
  | "explain"
  | "rewrite"
  | "fix"
  | "review"
  | "derive"
  | "math";

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
  /** When true, only offered if derivationCoach is enabled (#84). */
  derivationCoach?: boolean;
};

/** Primary chat `/` commands (intentionally small). */
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
    id: "derive",
    title: "Derive",
    hint: "Step-by-step coach (chat only)",
    derivationCoach: true,
    // Keep in sync with wrapDerivationCoachInstruction() (lib/derivation-coach.ts).
    instruction: [
      "[derivation-coach]",
      "Act as a derivation coach for the selected expression or the math near the caret (or the whole note if neither is clear).",
      "Walk through the reasoning step by step in chat.",
      "Do not emit @@@PATCH, @@@DOCUMENT, or any other note-edit markers — never change the buffer.",
      "Ask short clarifying questions when the goal is ambiguous.",
      "Prefer KaTeX-friendly \\( \\) / \\[ \\] in the chat reply.",
    ].join("\n"),
  },
  {
    id: "math",
    title: "To math",
    hint: "Plain English → LaTeX math",
    instruction:
      "Convert the selected plain-English description into KaTeX-friendly LaTeX math. Propose a full-document edit replacing the selection.",
  },
] as const;

/** Filter by id / title prefix (case-insensitive). */
export function filterSlashCommands(
  query: string,
  commands: readonly SlashCommand[] = SLASH_COMMANDS,
  opts?: {
    includeTemplates?: boolean;
    includeGrammarReview?: boolean;
    includeDerivationCoach?: boolean;
  },
): SlashCommand[] {
  const includeTemplates = opts?.includeTemplates ?? true;
  const includeGrammarReview = opts?.includeGrammarReview ?? true;
  const includeDerivationCoach = opts?.includeDerivationCoach ?? true;
  let pool = includeTemplates
    ? [...commands]
    : commands.filter((c) => !c.template);
  if (!includeGrammarReview) {
    pool = pool.filter((c) => !c.grammarReview);
  }
  if (!includeDerivationCoach) {
    pool = pool.filter((c) => !c.derivationCoach);
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

/** Strip a trailing `/` or `/partial` token before the caret. */
export function stripTrailingSlashToken(
  value: string,
  caret: number,
): { next: string; caret: number } {
  const before = value.slice(0, caret);
  const after = value.slice(caret);
  const match = before.match(/(^|[\s])\/[a-zA-Z]*$/);
  if (!match) return { next: value, caret };
  const trimmedBefore = before.replace(/(^|[\s])\/[a-zA-Z]*$/, "$1");
  return { next: trimmedBefore + after, caret: trimmedBefore.length };
}
