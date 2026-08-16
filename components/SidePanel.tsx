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
  /**
   * Keep children mounted while closed (hidden). Needed so Studio chat can
   * still run selection AI actions (#28) without remounting Yjs chat state.
   */
  keepMounted?: boolean;
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
  keepMounted = false,
}: SidePanelProps) {
  if (!open && !keepMounted) return null;

  const borderClass =
    side === "left"
      ? "border-b border-hairline-strong md:border-b-0 md:border-r"
      : "border-t border-hairline-strong md:border-t-0 md:border-l";

  const aside = (
    <aside
      className={`vt-side-panel vt-side-panel--${side} vt-pane-sized flex min-h-0 min-w-0 w-full shrink-0 flex-col overflow-x-clip ${borderClass} ${surfaceClassName}${
        open ? "" : " hidden"
      }`}
      style={
        {
          "--pane-width": `${width}px`,
          ...(mobileHeight != null
            ? { "--pane-mobile-height": `${mobileHeight}px` }
            : {}),
        } as CSSProperties
      }
      aria-label={ariaLabel}
      aria-hidden={!open}
      inert={!open ? true : undefined}
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
