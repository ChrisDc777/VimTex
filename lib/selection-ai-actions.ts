/**
 * Preset Studio selection / equation actions (#28, #83, #84).
 * Kept tiny and stable — copy is the product surface.
 */

import { wrapDerivationCoachInstruction } from "@/lib/derivation-coach";
import { EQUATION_REWRITE_INSTRUCTION } from "@/lib/render-note";

export type SelectionAiActionId =
  | "explain"
  | "simplify"
  | "fix"
  | "rewriteEq"
  | "coach";

export type SelectionAiAction = {
  id: SelectionAiActionId;
  /** Short button label */
  label: string;
  /** Instruction after @vimothy (no mention prefix). */
  instruction: string;
  /**
   * When true, expand a collapsed caret inside math to the full equation
   * span before packing AI context (#83).
   */
  preferEquationScope?: boolean;
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
  {
    id: "rewriteEq",
    label: "Rewrite eq",
    instruction: EQUATION_REWRITE_INSTRUCTION,
    preferEquationScope: true,
  },
  {
    id: "coach",
    label: "Coach",
    instruction: wrapDerivationCoachInstruction(),
    preferEquationScope: true,
  },
] as const;
