"use client";

import type { ReactNode } from "react";
import {
  ChatIcon,
  PreviewIcon,
  ReferenceIcon,
} from "@/components/SidePanelRail";

export type BottomPanelTabsProps = {
  problemOpen: boolean;
  previewOpen: boolean;
  chatOpen: boolean;
  disabled?: boolean;
  onToggleProblem: () => void;
  onTogglePreview: () => void;
  onToggleChat: () => void;
};

export function BottomPanelTabs({
  problemOpen,
  previewOpen,
  chatOpen,
  disabled,
  onToggleProblem,
  onTogglePreview,
  onToggleChat,
}: BottomPanelTabsProps) {
  return (
    <nav
      className="vt-bottom-tabs md:hidden"
      aria-label="Right panels"
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      <BottomTabButton
        label="Problem"
        pressed={problemOpen}
        disabled={disabled}
        onClick={onToggleProblem}
        icon={<ReferenceIcon />}
      />
      <BottomTabButton
        label="Preview"
        pressed={previewOpen}
        disabled={disabled}
        onClick={onTogglePreview}
        icon={<PreviewIcon />}
      />
      <BottomTabButton
        label="Chat"
        pressed={chatOpen}
        disabled={disabled}
        onClick={onToggleChat}
        icon={<ChatIcon />}
      />
    </nav>
  );
}

type BottomTabButtonProps = {
  label: string;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
};

function BottomTabButton({
  label,
  pressed,
  disabled,
  onClick,
  icon,
}: BottomTabButtonProps) {
  const className = pressed
    ? "vt-bottom-tabs__btn vt-bottom-tabs__btn--active"
    : "vt-bottom-tabs__btn";

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {icon}
      <span className="vt-bottom-tabs__label">{label}</span>
    </button>
  );
}
