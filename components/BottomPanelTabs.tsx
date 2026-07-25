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
  disabled?: boolean;
  onToggleProblem: () => void;
  onTogglePreview: () => void;
  onToggleChat: () => void;
};

export function BottomPanelTabs({
  problemOpen,
  previewOpen,
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
        pressed={false}
        disabled={disabled}
        premium
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
  premium?: boolean;
  onClick: () => void;
  icon: ReactNode;
};

function BottomTabButton({
  label,
  pressed,
  disabled,
  premium,
  onClick,
  icon,
}: BottomTabButtonProps) {
  const className = pressed
    ? "vt-bottom-tabs__btn vt-bottom-tabs__btn--active"
    : premium
      ? "vt-bottom-tabs__btn vt-bottom-tabs__btn--premium"
      : "vt-bottom-tabs__btn";

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={premium ? "Premium — live room chat" : label}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {icon}
      <span className="vt-bottom-tabs__label">{label}</span>
    </button>
  );
}
