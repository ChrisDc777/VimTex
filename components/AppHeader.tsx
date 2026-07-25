"use client";

import type { ReactNode } from "react";
import { ShareRoom } from "@/components/ShareRoom";
import { SheetMenu } from "@/components/SheetMenu";

type AppHeaderProps = {
  ready: boolean;
  roomId: string | null;
  note: string;
  referenceOpen: boolean;
  previewOpen: boolean;
  chatOpen: boolean;
  onNewSheet: () => void;
  onToggleReference: () => void;
  onTogglePreview: () => void;
  onToggleChat: () => void;
};

export function AppHeader({
  ready,
  roomId,
  note,
  referenceOpen,
  previewOpen,
  chatOpen,
  onNewSheet,
  onToggleReference,
  onTogglePreview,
  onToggleChat,
}: AppHeaderProps) {
  return (
    <header className="vt-header vt-chrome border-b">
      <div className="vt-header__brand vt-brand">
        <span className="vt-brand-mark" aria-hidden />
        <span className="vt-header__title">VimTex</span>
      </div>

      <div className="vt-header__nav">
        <nav className="vt-header__views" aria-label="Panels">
          <ViewToggle
            label="Problem"
            shortLabel="Prob"
            pressed={referenceOpen}
            disabled={!ready}
            onClick={onToggleReference}
            icon={<ReferenceIcon />}
          />
          <ViewToggle
            label="Preview"
            shortLabel="Prev"
            pressed={previewOpen}
            disabled={!ready}
            onClick={onTogglePreview}
            icon={<PreviewIcon />}
          />
          <ViewToggle
            label="Chat"
            shortLabel="Chat"
            pressed={chatOpen}
            disabled={!ready}
            onClick={onToggleChat}
            icon={<ChatIcon />}
          />
        </nav>

        <div className="vt-header__actions" aria-label="Collaboration and file">
          {roomId ? <ShareRoom roomId={roomId} /> : null}
          <SheetMenu note={note} disabled={!ready} onNewSheet={onNewSheet} />
        </div>
      </div>
    </header>
  );
}

type ViewToggleProps = {
  label: string;
  shortLabel: string;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
};

function ViewToggle({
  label,
  shortLabel,
  pressed,
  disabled,
  onClick,
  icon,
}: ViewToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={
        pressed ? "vt-view-toggle vt-view-toggle--active" : "vt-view-toggle"
      }
      title={label}
    >
      {icon}
      <span className="vt-view-toggle__label">{label}</span>
      <span className="vt-view-toggle__label--short">{shortLabel}</span>
    </button>
  );
}

function ReferenceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M5 6h6M5 8.5h4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="7"
        height="10"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M10 5.5h4v7h-4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v4A1.5 1.5 0 0 1 11.5 10H7l-2.5 2v-2H4.5A1.5 1.5 0 0 1 3 8.5v-4Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
