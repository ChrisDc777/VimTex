"use client";

import { useEffect, useId, useMemo } from "react";
import { formatShortcut } from "@/components/ShortcutHint";

type VimCheatsheetDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Re-opens the onboarding intro (optional; shown when provided). */
  onOpenOnboarding?: () => void;
};

function generalRows(): Array<{ keys: string; action: string }> {
  return [
    {
      keys: formatShortcut({ mod: true, key: "K" }),
      action: "Open command palette",
    },
    {
      keys: formatShortcut({ mod: true, key: "," }),
      action: "Open preferences",
    },
    {
      keys: formatShortcut({ mod: true, shift: true, key: "C" }),
      action: "Toggle Studio chat",
    },
    {
      keys: formatShortcut({ mod: true, shift: true, key: "V" }),
      action: "Toggle Live / Split view",
    },
    { keys: "?", action: "Open this shortcuts & tips panel" },
    { keys: "/", action: "Slash commands in Studio chat" },
    { keys: "i then /", action: "Insert section / todo / math block" },
    { keys: "@vimothy", action: "Ask Vimothy in Studio chat" },
  ];
}

function vimRows(): Array<{ keys: string; action: string }> {
  return [
    { keys: "Esc", action: "Normal mode" },
    { keys: "i / a / o", action: "Insert (before / after / new line)" },
    { keys: "hjkl", action: "Move left / down / up / right" },
    { keys: "w / b", action: "Next / previous word" },
    { keys: "dd / yy / p", action: "Delete / yank / paste line" },
    { keys: "u / Ctrl-r", action: "Undo / redo" },
    { keys: "v", action: "Visual select" },
    {
      keys: ":w mental model",
      action: "Autosave / share — no file write needed",
    },
  ];
}

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
  onOpenOnboarding,
}: VimCheatsheetDialogProps) {
  const titleId = useId();
  const general = useMemo(() => generalRows(), []);
  const vim = useMemo(() => vimRows(), []);

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
          <RowList rows={general} />
          <p className="vt-caption mt-4 text-mute">Vim keys</p>
          <RowList rows={vim} />
        </div>
        <div className="mt-5 flex items-center gap-3">
          {onOpenOnboarding ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOnboarding?.();
              }}
              className="vt-pill vt-pill--ghost vt-pill--label"
            >
              Replay welcome
            </button>
          ) : null}
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
