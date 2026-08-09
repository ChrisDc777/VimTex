"use client";

import {
  SELECTION_AI_ACTIONS,
  type SelectionAiAction,
} from "@/lib/selection-ai-actions";

type SelectionActionBarProps = {
  visible: boolean;
  /** When caret/selection is inside a math span (#83). */
  equationScoped?: boolean;
  disabled?: boolean;
  onAction: (action: SelectionAiAction) => void;
};

/**
 * Quiet bottom-of-editor bar when a range is selected or caret is in math (Studio).
 * Text labels, no icon pack — keeps the shell light.
 */
export function SelectionActionBar({
  visible,
  equationScoped = false,
  disabled = false,
  onAction,
}: SelectionActionBarProps) {
  if (!visible) return null;

  const actions = equationScoped
    ? SELECTION_AI_ACTIONS
    : SELECTION_AI_ACTIONS.filter((a) => a.id !== "rewriteEq");

  return (
    <div className="vt-sel-actions" role="toolbar" aria-label="Selection AI">
      <span className="vt-sel-actions__hint">
        {equationScoped ? "Equation" : "Selection"}
      </span>
      <div className="vt-sel-actions__btns">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="vt-sel-actions__btn"
            disabled={disabled}
            onClick={() => onAction(action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
