"use client";

import {
  abbreviateVimMode,
  formatCollabStatus,
  formatPeerCount,
  formatVimMode,
  statusDotClass,
} from "@/lib/status-labels";
import type { CollabStatus, VimMode } from "@/lib/types";

type StatusBarProps = {
  vimMode: VimMode;
  collabStatus: CollabStatus;
  peerCount: number;
  userName: string;
  onEditName?: () => void;
};

export function StatusBar({
  vimMode,
  collabStatus,
  peerCount,
  userName,
  onEditName,
}: StatusBarProps) {
  const modeLabel = formatVimMode(vimMode);
  const modeShort = abbreviateVimMode(vimMode);
  const statusLabel = formatCollabStatus(collabStatus);

  return (
    <footer className="vt-footer">
      <div className="vt-footer__mode">
        <span className="vt-mode-chip" title={modeLabel}>
          <span className="vt-footer__mode-full">{modeLabel}</span>
          <span className="vt-footer__mode-short" aria-hidden>
            {modeShort}
          </span>
        </span>
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

      <div className="vt-footer__status" role="status" aria-live="polite">
        <span className={statusDotClass(collabStatus)} aria-hidden />
        <span className="vt-footer__status-label">{statusLabel}</span>
        {collabStatus === "connected" ? (
          <>
            <span className="vt-footer__status-sep" aria-hidden>
              ·
            </span>
            <span className="vt-footer__peer-count">
              {formatPeerCount(peerCount)}
            </span>
          </>
        ) : null}
      </div>
    </footer>
  );
}
