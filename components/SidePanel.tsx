"use client";

import { type CSSProperties, type ReactNode } from "react";
import { PaneResizeHandle } from "@/components/PaneResizeHandle";

export type SidePanelProps = {
  side: "left" | "right";
  open: boolean;
  width: number;
  mobileHeight?: number;
  ariaLabel: string;
  surfaceClassName: string;
  onResize: (delta: number) => void;
  onResizeMobile?: (delta: number) => void;
  onReset: () => void;
  onResetMobile?: () => void;
  children: ReactNode;
};

export function SidePanel({
  side,
  open,
  width,
  mobileHeight,
  ariaLabel,
  surfaceClassName,
  onResize,
  onResizeMobile,
  onReset,
  onResetMobile,
  children,
}: SidePanelProps) {
  if (!open) return null;

  const borderClass =
    side === "left"
      ? "border-b border-hairline-strong md:border-b-0 md:border-r"
      : "border-t border-hairline-strong md:border-t-0 md:border-l";

  const aside = (
    <aside
      className={`vt-side-panel vt-side-panel--${side} vt-pane-sized flex min-h-0 w-full shrink-0 flex-col ${borderClass} ${surfaceClassName}`}
      style={
        {
          "--pane-width": `${width}px`,
          ...(mobileHeight != null
            ? { "--pane-mobile-height": `${mobileHeight}px` }
            : {}),
        } as CSSProperties
      }
      aria-label={ariaLabel}
    >
      {children}
    </aside>
  );

  const verticalHandle = (
    <PaneResizeHandle
      orientation="vertical"
      label={`Resize ${side} panel`}
      className="hidden md:flex"
      onResize={(delta) => onResize(side === "left" ? delta : -delta)}
      onReset={onReset}
    />
  );

  const mobileHandle =
    side === "right" && onResizeMobile ? (
      <PaneResizeHandle
        orientation="horizontal"
        label="Resize bottom panel height"
        className="md:hidden"
        onResize={onResizeMobile}
        onReset={onResetMobile ?? onReset}
      />
    ) : null;

  if (side === "left") {
    return (
      <>
        {aside}
        {verticalHandle}
      </>
    );
  }

  return (
    <>
      {mobileHandle}
      {verticalHandle}
      {aside}
    </>
  );
}
