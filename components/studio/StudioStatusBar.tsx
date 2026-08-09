"use client";

import { MOD_LABEL, ShortcutHint } from "@/components/ShortcutHint";
import { PeerChips } from "@/components/presence/PeerChips";
import type { CollabStatus, PeerInfo, VimMode } from "@/lib/types";

type StudioStatusBarProps = {
  vimMode: VimMode;
  collabStatus: CollabStatus;
  peers: PeerInfo[];
  selfClientId?: number | null;
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

export function StudioStatusBar({
  vimMode,
  collabStatus,
  peers,
  selfClientId,
  userName,
  onEditName,
  onOpenCheatsheet,
}: StudioStatusBarProps) {
  const mode = formatMode(vimMode);
  return (
    <footer className="vt-studio-footer">
      {onOpenCheatsheet ? (
        <button
          type="button"
          onClick={onOpenCheatsheet}
          className="vt-caption hidden text-mute underline-offset-2 hover:text-ink hover:underline sm:inline"
          title="Shortcuts & tips"
          aria-label="Open shortcuts & tips"
        >
          {mode}
        </button>
      ) : (
        <span className="vt-caption hidden text-mute sm:inline">{mode}</span>
      )}
      <ShortcutHint
        className="hidden sm:inline-flex"
        shortcuts={[
          { keys: `${MOD_LABEL} K`, label: "palette" },
          { keys: "/", label: "commands" },
          { keys: "?", label: "tips" },
        ]}
      />
      <span className="vt-studio-footer__meta">
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
            <PeerChips
              peers={peers}
              selfClientId={selfClientId}
              max={3}
              size={18}
            />
            <span className="shrink-0">{peers.length} online</span>
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
