"use client";

import { useEffect, useId } from "react";

type VimCheatsheetDialogProps = {
  open: boolean;
  onClose: () => void;
};

const GENERAL_ROWS: Array<{ keys: string; action: string }> = [
  { keys: "Ctrl/Cmd+K", action: "Open command palette" },
  { keys: "Ctrl/Cmd+,", action: "Open preferences" },
  { keys: "?", action: "Open this shortcuts & tips panel" },
];

const VIM_ROWS: Array<{ keys: string; action: string }> = [
  { keys: "Esc", action: "Normal mode" },
  { keys: "i / a / o", action: "Insert (before / after / new line)" },
  { keys: "hjkl", action: "Move left / down / up / right" },
  { keys: "w / b", action: "Next / previous word" },
  { keys: "dd / yy / p", action: "Delete / yank / paste line" },
  { keys: "u / Ctrl-r", action: "Undo / redo" },
  { keys: "v", action: "Visual select" },
  { keys: ":w mental model", action: "Autosave / share — no file write needed" },
];

function RowList({ rows }: { rows: Array<{ keys: string; action: string }> }) {
  return (
    <dl className="mt-3 space-y-2">
      {rows.map((row) => (
        <div
          key={row.keys}
          className="flex items-baseline justify-between gap-3 text-sm"
        >
          <dt className="shrink-0 font-mono text-ink">{row.keys}</dt>
          <dd className="min-w-0 text-right text-body">{row.action}</dd>
        </div>
      ))}
    </dl>
  );
}

export function VimCheatsheetDialog({
  open,
  onClose,
}: VimCheatsheetDialogProps) {
  const titleId = useId();

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

  return (
    <div
      className="vt-overlay fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="vt-dialog vt-elevated w-full max-w-md rounded-[var(--radius-sm)] p-6"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="vt-caption text-ink">
          Shortcuts & tips
        </p>
        <p className="mt-2 text-sm leading-5 text-body">
          Press <span className="font-mono">?</span> anytime (or click the mode
          label in the status bar) to reopen this.
        </p>
        <div className="mt-4">
          <p className="vt-caption text-mute">General</p>
          <RowList rows={GENERAL_ROWS} />
          <p className="vt-caption mt-4 text-mute">Vim keys</p>
          <RowList rows={VIM_ROWS} />
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="vt-pill vt-pill--solid vt-pill--label min-w-[7.5rem]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
