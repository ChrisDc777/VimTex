/**
 * Preset Studio selection actions (#28).
 * Kept tiny and stable — copy is the product surface.
 */

export type SelectionAiActionId = "explain" | "simplify" | "fix";

export type SelectionAiAction = {
  id: SelectionAiActionId;
  /** Short button label */
  label: string;
  /** Instruction after @vimothy (no mention prefix). */
  instruction: string;
};

export const SELECTION_AI_ACTIONS: readonly SelectionAiAction[] = [
  {
    id: "explain",
    label: "Explain",
    instruction:
      "Explain the selected TeX clearly and briefly. Do not change the note unless asked.",
  },
  {
    id: "simplify",
    label: "Simplify",
    instruction:
      "Simplify the selected expression. If a clearer form helps, propose a full-document edit.",
  },
  {
    id: "fix",
    label: "Fix TeX",
    instruction:
      "Fix TeX / KaTeX issues in the selection. Propose a full-document edit with the corrected note.",
  },
] as const;
