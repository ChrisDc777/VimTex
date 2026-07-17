"use client";

import { useEffect, useId, useRef, useState } from "react";

type NamePickerProps = {
  initialName?: string;
  open: boolean;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
  /** When true, Escape / Cancel closes without requiring a name. */
  allowSkip?: boolean;
};

export function NamePicker({
  initialName = "",
  open,
  onSubmit,
  onCancel,
  allowSkip = false,
}: NamePickerProps) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    setValue(initialName);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, initialName]);

  if (!open) return null;

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(trimmed.slice(0, 32));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === "Escape" && allowSkip) {
          e.preventDefault();
          onCancel?.();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas p-6">
        <p
          id={titleId}
          className="font-mono text-xs uppercase tracking-[1.4px] text-ink"
        >
          Display name
        </p>
        <p className="mt-2 text-sm text-body">
          Shown on your cursor for collaborators.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={32}
          placeholder="e.g. Axion"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="mt-4 w-full rounded-sm border border-hairline bg-canvas-soft px-4 py-3 text-base text-ink outline-none placeholder:text-mute focus:border-body-mid"
          autoComplete="nickname"
          spellCheck={false}
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-full border border-white/25 bg-ink px-4 py-2 text-sm text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {allowSkip ? "Save" : "Join room"}
          </button>
          {allowSkip ? (
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="rounded-full border border-white/25 px-4 py-2 text-sm text-ink"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
