"use client";

import type { CollabStatus, VimMode } from "@/lib/types";

type StatusBarProps = {
  vimMode: VimMode;
  collabStatus: CollabStatus;
  peerCount: number;
  userName: string;
  onEditName?: () => void;
};

function formatMode(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m.startsWith("vis")) return "VISUAL";
  if (m.startsWith("ins")) return "INSERT";
  if (m.startsWith("rep")) return "REPLACE";
  if (m.startsWith("nor") || m === "normal") return "NORMAL";
  return mode.toUpperCase();
}

export function StatusBar({
  vimMode,
  collabStatus,
  peerCount,
  userName,
  onEditName,
}: StatusBarProps) {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between gap-4 border-t border-hairline px-4">
      <span className="font-mono text-xs uppercase tracking-[1.2px] text-mute">
        {formatMode(vimMode)}
      </span>
      <span className="font-mono text-xs tracking-[1.2px] text-mute">
        {onEditName ? (
          <button
            type="button"
            onClick={onEditName}
            className="uppercase tracking-[1.2px] text-body underline-offset-2 hover:text-ink hover:underline"
            title="Change display name"
          >
            {userName}
          </button>
        ) : (
          <span className="uppercase tracking-[1.2px]">{userName}</span>
        )}
        {" · "}
        {collabStatus}
        {collabStatus === "connected" ? ` · ${peerCount} online` : ""} · live
        room
      </span>
    </footer>
  );
}
