"use client";

import {
  loadEditorMode,
  saveEditorMode,
  type EditorMode,
} from "@/lib/editor-mode";

type EditorModeToggleProps = {
  value: EditorMode;
  onChange: (mode: EditorMode) => void;
};

export function EditorModeToggle({ value, onChange }: EditorModeToggleProps) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Editor mode">
      {(
        [
          { id: "vim", label: "Vim" },
          { id: "standard", label: "Standard" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={value === opt.id}
          title={
            opt.id === "vim"
              ? "Vim keys (Esc, i, hjkl…). Name gate on Classic first visit."
              : "Normal typing — no Vim modes. Invitees skip the name gate."
          }
          onClick={() => {
            saveEditorMode(opt.id);
            onChange(opt.id);
          }}
          className={
            value === opt.id ? "vt-pill vt-pill--solid" : "vt-pill vt-pill--ghost"
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export { loadEditorMode, saveEditorMode };
