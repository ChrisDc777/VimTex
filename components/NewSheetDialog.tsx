"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  getAllTemplates,
  removeCustomTemplate,
  type SessionTemplate,
} from "@/lib/templates";

type NewSheetDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
};

export function NewSheetDialog({
  open,
  onClose,
  onSelect,
}: NewSheetDialogProps) {
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    setTemplates(getAllTemplates());
    const t = window.setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[data-sheet-card="true"]')
        ?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

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

  const handleDelete = (id: string) => {
    setTemplates(removeCustomTemplate(id));
  };

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
          New sheet
        </p>
        <p className="mt-2 text-sm leading-5 text-body">
          Pick a template to start from. Blank sheet starts truly empty.
        </p>
        <div
          ref={listRef}
          aria-label="Templates"
          className="mt-4 max-h-[min(60vh,20rem)] space-y-1.5 overflow-y-auto pr-0.5"
        >
          {templates.map((t) => {
            const custom = t.id.startsWith("custom-");
            return (
              <div
                key={t.id}
                className="flex items-stretch gap-2 rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft"
              >
                <button
                  type="button"
                  data-sheet-card="true"
                  onClick={() => onSelect(t.id)}
                  className="min-w-0 flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-left outline-none focus:bg-ink/5"
                >
                  <span className="block truncate text-sm text-ink">
                    {t.label}
                  </span>
                  <span className="vt-caption block truncate text-mute">
                    {t.hint}
                  </span>
                </button>
                {custom ? (
                  <button
                    type="button"
                    aria-label={`Delete ${t.label}`}
                    onClick={() => handleDelete(t.id)}
                    className="vt-pill vt-pill--ghost vt-pill--label m-1.5 shrink-0"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
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
