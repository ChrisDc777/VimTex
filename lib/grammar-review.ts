/**
 * Whole-document grammar/style review (#62 Level A).
 * Thin path: one slash / doc-action instruction → existing Confirm/diff (@@@PATCH preferred).
 * Chunked multi-suggestion panel deferred.
 */

/** Default model instruction for a whole-note grammar/style pass. */
export const GRAMMAR_REVIEW_INSTRUCTION = [
  "Proofread the entire note for grammar, spelling, punctuation, and style.",
  "Skip math mode, verbatim/listings, and comments when possible — do not rewrite equations or code-like TeX.",
  "Preserve meaning, structure, and KaTeX-friendly markup.",
  "Propose edits via a ranged @@@PATCH (preferred) or a full-document edit only if a patch is impractical.",
  "If the prose is already fine, say so briefly and do not emit edit markers.",
].join("\n");

/** Model instruction for a whole-note grammar/style pass. */
export function buildGrammarReviewInstruction(extra?: string): string {
  const trimmed = extra?.trim();
  if (!trimmed) return GRAMMAR_REVIEW_INSTRUCTION;
  return [
    GRAMMAR_REVIEW_INSTRUCTION,
    "",
    "Additional focus from the user:",
    trimmed,
  ].join("\n");
}
