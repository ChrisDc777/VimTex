"use client";

import { useEffect, useId, useState } from "react";
import {
  extractTemplateVariables,
  type SessionTemplate,
} from "@/lib/templates";

type TemplateVariablesDialogProps = {
  open: boolean;
  template: SessionTemplate | null;
  defaults: Record<string, string>;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
};

function prettifyVariable(key: string): string {
  return key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TemplateVariablesDialog({
  open,
  template,
  defaults,
  onClose,
  onSubmit,
}: TemplateVariablesDialogProps) {
  const titleId = useId();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !template) return;
    const next: Record<string, string> = {};
    for (const v of extractTemplateVariables(template.content)) {
      next[v] = defaults[v] ?? "";
    }
    setValues(next);
  }, [open, template, defaults]);

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

  if (!open || !template) return null;

  const variables = extractTemplateVariables(template.content);

  const submit = () => {
    const filled: Record<string, string> = {};
    for (const v of variables) filled[v] = values[v] ?? "";
    onSubmit(filled);
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
          New {template.label.toLowerCase()}
        </p>
        <p className="mt-2 text-sm leading-5 text-body">
          Fill in the blanks below — or clear a field to keep its placeholder.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {variables.map((v) => (
            <label key={v} className="block">
              <span className="vt-caption text-mute">
                {prettifyVariable(v)}
              </span>
              <input
                autoFocus
                type="text"
                value={values[v] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [v]: e.target.value }))
                }
                placeholder={`{{${v}}}`}
                className="mt-1 min-h-[var(--touch-min)] w-full rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft px-3 py-2 text-base text-ink outline-none placeholder:text-mute focus:border-body-mid focus:shadow-[var(--glow-breeze)]"
                spellCheck={false}
              />
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="vt-pill vt-pill--solid vt-pill--label min-w-[7.5rem]"
            >
              Create sheet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="vt-pill vt-pill--ghost vt-pill--label"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
