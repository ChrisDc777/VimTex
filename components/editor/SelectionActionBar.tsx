"use client";

import { SELECTION_AI_ACTIONS } from "@/lib/selection-ai-actions";

type SelectionActionBarProps = {
  visible: boolean;
  disabled?: boolean;
  onAction: (instruction: string) => void;
};

/**
 * Quiet bottom-of-editor bar when a range is selected (Studio).
 * Text labels, no icon pack — keeps the shell light.
 */
export function SelectionActionBar({
  visible,
  disabled = false,
  onAction,
}: SelectionActionBarProps) {
  if (!visible) return null;

  return (
    <div className="vt-sel-actions" role="toolbar" aria-label="Selection AI">
      <span className="vt-sel-actions__hint">Selection</span>
      <div className="vt-sel-actions__btns">
        {SELECTION_AI_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="vt-sel-actions__btn"
            disabled={disabled}
            onClick={() => onAction(action.instruction)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
