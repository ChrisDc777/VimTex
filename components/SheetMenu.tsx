"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SafeSvg } from "@/components/SafeSvg";
import { exportAsMd, exportAsTex } from "@/lib/export";

type SheetMenuProps = {
  note: string;
  disabled?: boolean;
  canNewSheet?: boolean;
  onNewSheet: () => void;
  onPremiumLiveShare: () => void;
};

export function SheetMenu({
  note,
  disabled,
  canNewSheet = true,
  onNewSheet,
  onPremiumLiveShare,
}: SheetMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className="vt-header-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        Sheet
        <ChevronIcon className={open ? "rotate-180" : ""} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="vt-header-menu vt-elevated--sm vt-dropdown"
        >
          <button
            type="button"
            role="menuitem"
            className="vt-header-menu__item"
            disabled={!canNewSheet}
            title={canNewSheet ? undefined : "Maximum 5 tabs"}
            onClick={() => run(onNewSheet)}
          >
            <span className="vt-header-menu__label">New sheet</span>
            <span className="vt-header-menu__hint">
              {canNewSheet ? "Fresh room" : "Max 5 tabs"}
            </span>
          </button>
          <div className="vt-header-menu__divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="vt-header-menu__item vt-header-menu__item--premium"
            onClick={() => run(onPremiumLiveShare)}
          >
            <span className="vt-header-menu__label">Live share</span>
            <span className="vt-header-menu__hint">Premium</span>
          </button>
          <div className="vt-header-menu__divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="vt-header-menu__item"
            onClick={() => run(() => exportAsTex(note))}
          >
            <span className="vt-header-menu__label">Export as LaTeX</span>
            <span className="vt-header-menu__hint">.tex</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="vt-header-menu__item"
            onClick={() => run(() => exportAsMd(note))}
          >
            <span className="vt-header-menu__label">Export as Markdown</span>
            <span className="vt-header-menu__hint">.md</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <SafeSvg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={`shrink-0 opacity-60 transition-transform duration-150 ${className ?? ""}`}
    >
      <path
        d="M3.5 5.25 7 8.75l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}
