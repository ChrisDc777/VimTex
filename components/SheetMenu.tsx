"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SafeSvg } from "@/components/SafeSvg";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import { exportAsMd, exportAsTex } from "@/lib/export";
import type { EditorMode } from "@/lib/editor-mode";
import type { RecentRoom } from "@/lib/recent-rooms";
import type { UiVariant } from "@/lib/ui-variant";

type SheetMenuProps = {
  note: string;
  disabled?: boolean;
  canNewSheet?: boolean;
  onNewSheet: () => void;
  uiVariant?: UiVariant;
  onUiVariantChange?: (variant: UiVariant) => void;
  relativeLineNumbers?: boolean;
  onRelativeLineNumbersChange?: (enabled: boolean) => void;
  editorMode?: EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
  recentRooms?: RecentRoom[];
  onClearRecentRooms?: () => void;
  onOpenRoom?: (roomId: string) => void;
  openRoomIds?: ReadonlySet<string>;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

const MENU_INSET = 16;
const MENU_GAP = 6;
const MENU_MAX_WIDTH = 216; // 13.5rem

function measureMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const width = Math.min(MENU_MAX_WIDTH, viewportWidth - MENU_INSET * 2);
  let left = rect.right - width;
  left = Math.max(
    MENU_INSET,
    Math.min(left, viewportWidth - width - MENU_INSET),
  );
  const top = rect.bottom + MENU_GAP;
  return { top, left, width };
}

export function SheetMenu({
  note,
  disabled,
  canNewSheet = true,
  onNewSheet,
  uiVariant,
  onUiVariantChange,
  relativeLineNumbers,
  onRelativeLineNumbersChange,
  editorMode,
  onEditorModeChange,
  recentRooms = [],
  onClearRecentRooms,
  onOpenRoom,
  openRoomIds,
}: SheetMenuProps) {
  const [open, setOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const justOpenedRef = useRef(false);
  const menuId = useId();

  const showRecents = onClearRecentRooms != null && onOpenRoom != null;
  const showPreferences =
    editorMode != null &&
    onEditorModeChange != null &&
    uiVariant != null &&
    onUiVariantChange != null;

  useEffect(() => {
    setMounted(true);
  }, []);

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
        {showRecents ? (
          <>
            <div className="vt-header-menu__divider" role="separator" />
            <div className="flex items-center justify-between px-2 py-1">
              <span className="vt-caption text-mute">Recent</span>
              {recentRooms.length > 0 ? (
                <button
                  type="button"
                  className="vt-header-menu__clear"
                  onClick={() => run(onClearRecentRooms!)}
                >
                  Clear
                </button>
              ) : null}
            </div>
            {recentRooms.length > 0 ? (
              <div
                className="vt-header-menu__recent"
                role="group"
                aria-label="Recent rooms"
              >
                {recentRooms.map((r) => {
                  const roomNotOpenable =
                    !canNewSheet && !(openRoomIds?.has(r.id) ?? false);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="menuitem"
                      className="vt-header-menu__item"
                      disabled={roomNotOpenable}
                      title={
                        roomNotOpenable
                          ? "Maximum 5 tabs"
                          : `Last visited ${new Date(r.at).toLocaleString()}`
                      }
                      onClick={() => run(() => onOpenRoom?.(r.id))}
                    >
                      <span className="vt-header-menu__label font-mono">
                        {r.id}
                      </span>
                      <span className="vt-header-menu__hint">
                        {roomNotOpenable ? "Max 5 tabs" : "Open"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className="vt-header-menu__item vt-caption text-mute"
                role="presentation"
              >
                No recent rooms
              </div>
            )}
          </>
        ) : null}
        {showPreferences ? (
          <>
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
          </>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className="vt-header-btn vt-header-btn--menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Sheet"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="vt-header-btn__label">Sheet</span>
        <MenuIcon className="vt-header-btn__menu-icon" />
        <ChevronIcon className={`vt-header-btn__chevron${open ? " rotate-180" : ""}`} />
      </button>

      {menu && mounted ? createPortal(menu, document.body) : null}
      {showPreferences ? (
        <PreferencesDialog
          open={prefsOpen}
          onClose={() => setPrefsOpen(false)}
          editorMode={editorMode!}
          onEditorModeChange={onEditorModeChange!}
          relativeLineNumbers={relativeLineNumbers ?? true}
          onRelativeLineNumbersChange={
            onRelativeLineNumbersChange ?? (() => {})
          }
          uiVariant={uiVariant!}
          onUiVariantChange={onUiVariantChange!}
        />
      ) : null}
    </div>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <SafeSvg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className={className ?? ""}
    >
      <path
        d="M3.5 5h11M3.5 9h11M3.5 13h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </SafeSvg>
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
