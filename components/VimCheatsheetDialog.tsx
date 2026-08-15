"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatShortcut } from "@/components/ShortcutHint";

type VimCheatsheetDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Re-opens the onboarding intro (optional; shown when provided). */
  onOpenOnboarding?: () => void;
};

type TabId = "app" | "vim";

function appRows(): Array<{ keys: string; action: string }> {
  return [
    {
      keys: formatShortcut({ mod: true, key: "K" }),
      action: "Command palette",
    },
    {
      keys: formatShortcut({ mod: true, key: "," }),
      action: "Preferences",
    },
    {
      keys: formatShortcut({ mod: true, shift: true, key: "C" }),
      action: "Toggle chat",
    },
    {
      keys: formatShortcut({ mod: true, shift: true, key: "V" }),
      action: "Live / Split view",
    },
    { keys: "/", action: "Slash commands in chat" },
  ];
}

function vimRows(): Array<{ keys: string; action: string }> {
  return [
    { keys: "Esc", action: "Normal mode" },
    { keys: "i / a / o", action: "Insert" },
    { keys: "hjkl", action: "Move" },
    { keys: "w / b", action: "Word next / prev" },
    { keys: "dd / yy / p", action: "Delete / yank / paste" },
    { keys: "u / Ctrl-r", action: "Undo / redo" },
    { keys: "v", action: "Visual select" },
  ];
}

function RowList({ rows }: { rows: Array<{ keys: string; action: string }> }) {
  return (
    <dl className="vt-cheatsheet__list">
      {rows.map((row) => (
        <div key={row.keys} className="vt-cheatsheet__row">
          <dt className="vt-cheatsheet__keys">{row.keys}</dt>
          <dd className="vt-cheatsheet__action">{row.action}</dd>
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
  const [tab, setTab] = useState<TabId>("app");
  const app = useMemo(() => appRows(), []);
  const vim = useMemo(() => vimRows(), []);

  useEffect(() => {
    if (!open) return;
    setTab("app");
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
        className="vt-dialog vt-elevated w-full max-w-sm rounded-[var(--radius-sm)] p-5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="vt-caption text-ink">
          Shortcuts & tips
        </p>
        <p className="mt-1 text-sm leading-5 text-mute">
          Press <span className="font-mono text-ink">?</span> anytime to reopen.
        </p>

        <div className="vt-cheatsheet__tabs" role="tablist" aria-label="Shortcut groups">
          <button
            type="button"
            role="tab"
            id="vt-cheatsheet-tab-app"
            aria-selected={tab === "app"}
            aria-controls="vt-cheatsheet-panel-app"
            className="vt-cheatsheet__tab"
            onClick={() => setTab("app")}
          >
            App
          </button>
          <button
            type="button"
            role="tab"
            id="vt-cheatsheet-tab-vim"
            aria-selected={tab === "vim"}
            aria-controls="vt-cheatsheet-panel-vim"
            className="vt-cheatsheet__tab"
            onClick={() => setTab("vim")}
          >
            Vim
          </button>
        </div>

        {tab === "app" ? (
          <div
            id="vt-cheatsheet-panel-app"
            role="tabpanel"
            aria-labelledby="vt-cheatsheet-tab-app"
          >
            <RowList rows={app} />
            <p className="vt-cheatsheet__hint">
              In chat: <span className="font-mono">@vimothy</span> · insert with{" "}
              <span className="font-mono">i</span> then{" "}
              <span className="font-mono">/</span>
            </p>
          </div>
        ) : (
          <div
            id="vt-cheatsheet-panel-vim"
            role="tabpanel"
            aria-labelledby="vt-cheatsheet-tab-vim"
          >
            <RowList rows={vim} />
            <p className="vt-cheatsheet__hint">
              No <span className="font-mono">:w</span> needed — notes autosave
              and sync live.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
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
