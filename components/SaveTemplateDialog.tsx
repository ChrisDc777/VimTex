"use client";

import { useEffect, useId, useRef, useState } from "react";

type SaveTemplateDialogProps = {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function SaveTemplateDialog({
  open,
  defaultName,
  onClose,
  onSave,
}: SaveTemplateDialogProps) {
  const [value, setValue] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    setValue(defaultName);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = value.trim();
  const canSave = trimmed.length > 0;

  return (
    <div
      className="vt-overlay fixed inset-0 z-[80] flex items-center justify-center bg-canvas/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="vt-dialog vt-elevated w-full max-w-sm rounded-[var(--radius-sm)] p-6"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="vt-caption text-ink">
          Save as template
        </p>
        <p className="mt-2 text-sm leading-5 text-body">
          Save the current note as a reusable template for new sheets.
        </p>
        <label className="mt-4 block">
          <span className="vt-caption text-mute">Template name</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            maxLength={40}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canSave) onSave(trimmed);
              }
            }}
            placeholder="e.g. My homework header"
            className="mt-1 min-h-[var(--touch-min)] w-full rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft px-3 py-2 text-base text-ink outline-none placeholder:text-mute focus:border-body-mid focus:shadow-[var(--glow-breeze)]"
            spellCheck={false}
          />
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(trimmed)}
            className="vt-pill vt-pill--solid vt-pill--label min-w-[7.5rem]"
          >
            Save template
          </button>
          <button
            type="button"
            onClick={onClose}
            className="vt-pill vt-pill--ghost vt-pill--label"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
