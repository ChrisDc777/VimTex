"use client";

import {
  abbreviateVimMode,
  formatCollabStatus,
  formatVimMode,
  statusDotClass,
} from "@/lib/status-labels";
import { formatShortcut, ShortcutHint } from "@/components/ShortcutHint";
import { PeerChips } from "@/components/presence/PeerChips";
import type { CollabStatus, PeerInfo, VimMode } from "@/lib/types";

type StatusBarProps = {
  vimMode: VimMode;
  collabStatus: CollabStatus;
  peers: PeerInfo[];
  selfClientId?: number | null;
  userName: string;
  onEditName?: () => void;
  onOpenCheatsheet?: () => void;
};

export function StatusBar({
  vimMode,
  collabStatus,
  peers,
  selfClientId,
  userName,
  onEditName,
  onOpenCheatsheet,
}: StatusBarProps) {
  const modeLabel = formatVimMode(vimMode);
  const modeShort = abbreviateVimMode(vimMode);
  const statusLabel = formatCollabStatus(collabStatus);

  const modeChip = (
    <>
      <span className="vt-footer__mode-full">{modeLabel}</span>
      <span className="vt-footer__mode-short" aria-hidden>
        {modeShort}
      </span>
    </>
  );

  return (
    <footer className="vt-footer">
      <div className="vt-footer__mode">
        {onOpenCheatsheet ? (
          <button
            type="button"
            className="vt-mode-chip"
            title="Shortcuts & tips"
            aria-label="Open shortcuts & tips"
            onClick={onOpenCheatsheet}
          >
            {modeChip}
          </button>
        ) : (
          <span className="vt-mode-chip" title={modeLabel}>
            {modeChip}
          </span>
        )}
      </div>

      <div className="vt-footer__identity">
        {onEditName ? (
          <button
            type="button"
            onClick={onEditName}
            className="vt-footer__name-chip"
            aria-label="Change display name"
            title="Change display name"
          >
            {userName}
          </button>
        ) : (
          <span className="vt-footer__name-chip vt-footer__name-chip--static">
            {userName}
          </span>
        )}
      </div>

      <ShortcutHint
        shortcuts={[
          {
            keys: formatShortcut({ mod: true, key: "," }),
            label: "preferences",
          },
          { keys: "?", label: "tips" },
        ]}
      />

      <div className="vt-footer__status" role="status" aria-live="polite">
        <span className={statusDotClass(collabStatus)} aria-hidden />
        <span className="vt-footer__status-label">{statusLabel}</span>
        {collabStatus === "connected" ? (
          <PeerChips
            peers={peers}
            selfClientId={selfClientId}
            max={3}
            size={18}
          />
        ) : null}
      </div>
    </footer>
  );
}
