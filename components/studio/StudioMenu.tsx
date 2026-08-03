"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SafeSvg } from "@/components/SafeSvg";
import type { EditorMode } from "@/lib/editor-mode";
import { exportAsMd, exportAsTex } from "@/lib/export";
import type { UiVariant } from "@/lib/ui-variant";
import { getAllTemplates } from "@/lib/templates";
import type { RecentRoom } from "@/lib/recent-rooms";
import type { NewRoomOptions } from "@/lib/types";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import { subscribeOpenPreferences } from "@/lib/ui-events";

type StudioMenuProps = {
  note: string;
  disabled?: boolean;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  uiVariant: UiVariant;
  onUiVariantChange: (variant: UiVariant) => void;
  onNewRoom: (opts?: NewRoomOptions) => void;
  recentRooms: RecentRoom[];
  onClearRecentRooms: () => void;
  relativeLineNumbers: boolean;
  onRelativeLineNumbersChange: (enabled: boolean) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

const MENU_INSET = 16;
const MENU_GAP = 6;
const MENU_MAX_WIDTH = 220;

function measureMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const width = Math.min(MENU_MAX_WIDTH, viewportWidth - MENU_INSET * 2);
  let left = rect.right - width;
  left = Math.max(
    MENU_INSET,
    Math.min(left, viewportWidth - width - MENU_INSET),
  );
  return { top: rect.bottom + MENU_GAP, left, width };
}

export function StudioMenu({
  note,
  disabled,
  editorMode,
  onEditorModeChange,
  uiVariant,
  onUiVariantChange,
  onNewRoom,
  recentRooms,
  onClearRecentRooms,
  relativeLineNumbers,
  onRelativeLineNumbersChange,
}: StudioMenuProps) {
  const [open, setOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const justOpenedRef = useRef(false);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => subscribeOpenPreferences(() => setPrefsOpen(true)), []);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    setMenuPosition(measureMenuPosition(buttonRef.current));
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    justOpenedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      justOpenedRef.current = false;
    });

    const close = (event: PointerEvent) => {
      if (justOpenedRef.current) return;
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest(`#${CSS.escape(menuId)}`)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const timeout = window.setTimeout(() => {
      document.addEventListener("pointerdown", close);
    }, 0);

    window.addEventListener("resize", updateMenuPosition);
    window.visualViewport?.addEventListener("resize", updateMenuPosition);
    window.visualViewport?.addEventListener("scroll", updateMenuPosition);
    document.addEventListener("keydown", onKey);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updateMenuPosition);
      window.visualViewport?.removeEventListener("resize", updateMenuPosition);
      window.visualViewport?.removeEventListener("scroll", updateMenuPosition);
    };
  }, [open, menuId, updateMenuPosition]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  const menu =
    open && menuPosition && mounted ? (
      <div
        id={menuId}
        role="menu"
        className="vt-header-menu vt-header-menu--portal vt-elevated--sm vt-dropdown"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
        }}
      >
        <div className="vt-caption px-2 py-1 text-mute">New</div>
        <button
          type="button"
          role="menuitem"
          className="vt-header-menu__item"
          onClick={() => run(() => onNewRoom())}
        >
          <span className="vt-header-menu__label">New room</span>
          <span className="vt-header-menu__hint">Starter</span>
        </button>
        {getAllTemplates()
          .filter((t) => t.id !== "blank")
          .map((t) => (
          <button
            key={t.id}
            type="button"
            role="menuitem"
            className="vt-header-menu__item"
            onClick={() => run(() => onNewRoom({ templateId: t.id }))}
          >
            <span className="vt-header-menu__label">{t.label}</span>
            <span className="vt-header-menu__hint">{t.hint}</span>
          </button>
        ))}
        <div className="vt-header-menu__divider" role="separator" />
        <div className="vt-caption px-2 py-1 text-mute">Export</div>
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
        <div className="vt-header-menu__divider" role="separator" />
        <div className="flex items-center justify-between px-2 py-1">
          <span className="vt-caption text-mute">Recent</span>
          {recentRooms.length > 0 ? (
            <button
              type="button"
              className="vt-header-menu__clear"
              onClick={() => run(onClearRecentRooms)}
            >
              Clear
            </button>
          ) : null}
        </div>
        {recentRooms.length > 0 ? (
          <div className="vt-header-menu__recent" role="group" aria-label="Recent rooms">
            {recentRooms.map((r) => (
              <button
                key={r.id}
                type="button"
                role="menuitem"
                className="vt-header-menu__item"
                title={`Last visited ${new Date(r.at).toLocaleString()}`}
                onClick={() => run(() => onNewRoom({ roomId: r.id }))}
              >
                <span className="vt-header-menu__label font-mono">{r.id}</span>
                <span className="vt-header-menu__hint">Open</span>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="vt-header-menu__item vt-caption text-mute"
            role="presentation"
          >
            No recent rooms
          </div>
        )}
        <div className="vt-header-menu__divider" role="separator" />
        <button
          type="button"
          role="menuitem"
          className="vt-header-menu__item"
          onClick={() => {
            setOpen(false);
            setPrefsOpen(true);
          }}
        >
          <span className="vt-header-menu__label">Preferences…</span>
          <span className="vt-header-menu__hint">Editor, workspace</span>
        </button>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className="vt-pill vt-pill--ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Room menu"
        title="New room, export, editor options"
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon />
        <span className="hidden sm:inline">Menu</span>
      </button>
      {menu && mounted ? createPortal(menu, document.body) : null}
      <PreferencesDialog
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        editorMode={editorMode}
        onEditorModeChange={onEditorModeChange}
        relativeLineNumbers={relativeLineNumbers}
        onRelativeLineNumbersChange={onRelativeLineNumbersChange}
        uiVariant={uiVariant}
        onUiVariantChange={onUiVariantChange}
      />
    </div>
  );
}

function MenuIcon() {
  return (
    <SafeSvg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M3 4.5h10M3 8h10M3 11.5h10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}
