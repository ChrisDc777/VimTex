"use client";

import type { CollabStatus, VimMode } from "@/lib/types";

type ClassicStatusBarProps = {
  vimMode: VimMode;
  collabStatus: CollabStatus;
  peerCount: number;
  userName: string;
  onEditName?: () => void;
  onOpenCheatsheet?: () => void;
};

function formatMode(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m === "standard") return "STANDARD";
  if (m.startsWith("vis")) return "VISUAL";
  if (m.startsWith("ins")) return "INSERT";
  if (m.startsWith("rep")) return "REPLACE";
  if (m.startsWith("nor") || m === "normal") return "NORMAL";
  return mode.toUpperCase();
}

export function ClassicStatusBar({
  vimMode,
  collabStatus,
  peerCount,
  userName,
  onEditName,
  onOpenCheatsheet,
}: ClassicStatusBarProps) {
  const mode = formatMode(vimMode);
  return (
    <footer className="vt-classic-footer">
      {onOpenCheatsheet ? (
        <button
          type="button"
          onClick={onOpenCheatsheet}
          className="vt-caption hidden text-mute underline-offset-2 hover:text-ink hover:underline sm:inline"
          title="Vim cheatsheet"
          aria-label="Open Vim cheatsheet"
        >
          {mode}
        </button>
      ) : (
        <span className="vt-caption hidden text-mute sm:inline">{mode}</span>
      )}
      <span className="vt-classic-footer__meta">
        {onEditName ? (
          <button
            type="button"
            onClick={onEditName}
            className="max-w-[40vw] truncate uppercase tracking-[1.2px] text-body underline-offset-2 hover:text-ink hover:underline sm:max-w-none"
            title="Change display name"
          >
            {userName}
          </button>
        ) : (
          <span className="truncate uppercase tracking-[1.2px]">{userName}</span>
        )}
        <span className="shrink-0" aria-hidden>
          ·
        </span>
        <span className="shrink-0 lowercase first-letter:uppercase">
          {collabStatus}
        </span>
        {collabStatus === "connected" ? (
          <>
            <span className="shrink-0" aria-hidden>
              ·
            </span>
            <span className="shrink-0">{peerCount} online</span>
          </>
        ) : null}
        <span className="hidden shrink-0 sm:inline" aria-hidden>
          ·
        </span>
        <span className="hidden shrink-0 sm:inline">live room</span>
      </span>
    </footer>
  );
}
