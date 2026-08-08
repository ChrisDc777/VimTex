"use client";

import type { DocAiAction } from "@/lib/doc-ai-actions";

type DocActionPillsProps = {
  actions: readonly DocAiAction[];
  disabled?: boolean;
  onRun: (action: DocAiAction) => void;
};

/** Compact action row above the Studio chat composer (#58). */
export function DocActionPills({
  actions,
  disabled,
  onRun,
}: DocActionPillsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="vt-chat-doc-actions" role="toolbar" aria-label="Document actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="vt-chat-doc-actions__pill"
          disabled={disabled}
          onClick={() => onRun(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
