"use client";

import type { ReactNode } from "react";
import { SafeSvg } from "@/components/SafeSvg";

export type SidePanelRailProps = {
  side: "left" | "right";
  label: string;
  disabled?: boolean;
  children: ReactNode;
};

export function SidePanelRail({
  side,
  label,
  disabled,
  children,
}: SidePanelRailProps) {
  return (
    <nav
      className={`vt-panel-rail vt-panel-rail--${side}`}
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      {children}
    </nav>
  );
}

export type SidePanelRailButtonProps = {
  label: string;
  pressed: boolean;
  disabled?: boolean;
  premium?: boolean;
  onClick: () => void;
  icon: ReactNode;
};

export function SidePanelRailButton({
  label,
  pressed,
  disabled,
  premium,
  onClick,
  icon,
}: SidePanelRailButtonProps) {
  const title = premium ? "Premium — live room chat" : label;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        pressed
          ? "vt-panel-rail__btn vt-panel-rail__btn--active"
          : premium
            ? "vt-panel-rail__btn vt-panel-rail__btn--premium"
            : "vt-panel-rail__btn"
      }
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function ReferenceIcon() {
  return (
    <SafeSvg width={18} height={18} viewBox="0 0 16 16" fill="none" aria-hidden>
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
    </SafeSvg>
  );
}

export function PreviewIcon() {
  return (
    <SafeSvg width={18} height={18} viewBox="0 0 16 16" fill="none" aria-hidden>
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
    </SafeSvg>
  );
}

export function ChatIcon() {
  return (
    <SafeSvg width={18} height={18} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v4A1.5 1.5 0 0 1 11.5 10H7l-2.5 2v-2H4.5A1.5 1.5 0 0 1 3 8.5v-4Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}
