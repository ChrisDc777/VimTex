/**
 * Derivation coach (#84) — step-by-step chat, never mutates the note.
 * Primary fit for Forge; also available in Studio.
 */

/** Default model instruction for a chat-only derivation walkthrough. */
export const DERIVATION_COACH_INSTRUCTION = [
  "Act as a derivation coach for the selected expression or the math near the caret (or the whole note if neither is clear).",
  "Walk through the reasoning step by step in chat.",
  "Do not emit @@@PATCH, @@@DOCUMENT, or any other note-edit markers — never change the buffer.",
  "Ask short clarifying questions when the goal is ambiguous.",
  "Prefer KaTeX-friendly \\( \\) / \\[ \\] in the chat reply.",
].join("\n");

/** Stable marker we set on client instructions when coach mode is active. */
export const DERIVATION_COACH_MODE_PREFIX = "[derivation-coach]";

export function wrapDerivationCoachInstruction(extra?: string): string {
  const tail = (extra ?? "").trim();
  return tail
    ? `${DERIVATION_COACH_MODE_PREFIX}\n${DERIVATION_COACH_INSTRUCTION}\n\nUser focus:\n${tail}`
    : `${DERIVATION_COACH_MODE_PREFIX}\n${DERIVATION_COACH_INSTRUCTION}`;
}

export function isDerivationCoachInstruction(instruction: string): boolean {
  return instruction.trimStart().startsWith(DERIVATION_COACH_MODE_PREFIX);
}

/** Extra system rules when mode=coach (also strip edit format from the default prompt). */
export const DERIVATION_COACH_SYSTEM_RULES = `Derivation-coach mode (hard rules):
- Teach step by step in chat only.
- NEVER emit @@@PATCH, @@@DOCUMENT, FIND/THEN edit blocks, or any note-mutation markers.
- Do not rewrite the document buffer. If the learner should type something, describe it in prose.
- Keep steps short; wait for the next question rather than dumping the full solution at once unless asked.`;
